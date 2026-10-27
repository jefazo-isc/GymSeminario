import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { of } from "rxjs";
import SignInComponent from "../../auth/features/sign-in/sign-in.component";
import SignUpComponent from "../../auth/features/sign-up/sign-up.component";
import { AuthService } from "../../auth/data-access/auth.service";
import { CaptchaController } from "../../core/auth/captcha-controller";
import { authErrorMessage } from "../../core/auth/auth-feedback";
import { PasswordToggleDirective } from "../../shared/ui/password-toggle.directive";
import { pageMetaFor } from "../../core/navigation/page-meta";
import { routes } from "../../app.routes";
import { HomeComponent } from "../../components/home/home.component";

@Component({
  standalone: true,
  imports: [PasswordToggleDirective],
  template:
    '<input appPassword #pass="appPassword"><button type="button" (click)="pass.toggle()" [attr.aria-pressed]="pass.visible()">{{pass.label()}}</button>',
})
class PasswordHarness {}
describe("Password control", () => {
  it("starts masked and exposes its selected state without losing the input value", () => {
    const fixture = TestBed.createComponent(PasswordHarness);
    fixture.detectChanges();
    const input: HTMLInputElement =
      fixture.nativeElement.querySelector("input");
    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector("button");
    input.value = "unit-test-only";
    expect(input.type).toBe("password");
    button.click();
    fixture.detectChanges();
    expect(input.type).toBe("text");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(input.value).toBe("unit-test-only");
    button.click();
    fixture.detectChanges();
    expect(input.type).toBe("password");
  });
});

describe("Authentication feedback and submission", () => {
  let auth: any;
  beforeEach(() => {
    auth = {
      auth: {},
      signIn: jasmine.createSpy().and.resolveTo(),
      signUp: jasmine.createSpy().and.resolveTo(),
      signInWithGoogle: jasmine.createSpy().and.resolveTo(),
      userName$: of(null),
      userRole$: of(null),
    };
    spyOn(CaptchaController.prototype, "init").and.stub();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });
  it("does not submit before a resolved CAPTCHA and uses persistent labels", async () => {
    const fixture = TestBed.createComponent(SignInComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.setValue({
      email: "example@example.test",
      password: "Unit123",
    });
    await component.submit();
    expect(auth.signIn).not.toHaveBeenCalled();
    expect(component.message).toContain("verificación");
    expect(
      fixture.nativeElement.querySelector('label[for="auth-email"]'),
    ).not.toBeNull();
  });
  it("prevents a double sign-in while the existing provider is pending", async () => {
    const fixture = TestBed.createComponent(SignInComponent);
    const component = fixture.componentInstance;
    let resolve!: () => void;
    auth.signIn.and.returnValue(new Promise<void>((r) => (resolve = r)));
    spyOn(TestBed.inject(Router), "navigate").and.resolveTo(true);
    component.form.setValue({
      email: "example@example.test",
      password: "Unit123",
    });
    component.captcha.resolved.set(true);
    const pending = component.submit();
    await component.submit();
    expect(auth.signIn.calls.count()).toBe(1);
    resolve();
    await pending;
    expect(component.busy).toBeNull();
  });
  it("retains the original signup rules and confirmation check", () => {
    const component =
      TestBed.createComponent(SignUpComponent).componentInstance;
    component.form.setValue({
      nombre: "Example",
      email: "example@example.test",
      password: "lowercase",
      confirmPassword: "lowercase",
    });
    expect(component.form.invalid).toBeTrue();
    component.form.controls.password.setValue("Upper123");
    component.form.controls.confirmPassword.setValue("Upper123");
    expect(component.form.valid).toBeTrue();
    component.form.controls.confirmPassword.setValue("Different123");
    expect(component.form.invalid).toBeTrue();
  });
  it("turns SDK failures into understandable messages and preserves the existing lockout message", () => {
    expect(authErrorMessage({ code: "auth/network-request-failed" })).toContain(
      "conexión",
    );
    expect(
      authErrorMessage({ code: "auth/invalid-verification-code" }),
    ).toContain("seis dígitos");
    expect(
      authErrorMessage(
        new Error(
          "Demasiados intentos fallidos. Cambia tu clave para poder ingresar.",
        ),
      ),
    ).toContain("Cambia tu clave");
  });
});

describe("Page organization", () => {
  it("assigns a page identity to every existing concrete route and keeps the legacy sign-in URL compatible", () => {
    for (const route of routes) {
      if (route.path && !route.redirectTo && route.path !== "auth")
        expect(pageMetaFor("/" + route.path.replace(":id", "1")))
          .withContext(route.path)
          .toBeDefined();
    }
    expect(pageMetaFor("/auth/sign-in")?.section).toBe("Ingresar");
    expect(pageMetaFor("/auth/sign-up")?.section).toBe("Crear cuenta");
    expect(routes.find((route) => route.path === "sesion")?.redirectTo).toBe(
      "/auth/sign-in",
    );
  });
  it("uses a curated homepage with clear destinations and no third-party embeds", () => {
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelectorAll("h1").length).toBe(1);
    expect(host.querySelectorAll("iframe").length).toBe(0);
    expect(host.querySelector('a[href="/membresias"]')).not.toBeNull();
    expect(host.querySelector('a[href="/carrusel"]')).not.toBeNull();
    expect(host.querySelector("app-video-cards")).toBeNull();
  });
});
