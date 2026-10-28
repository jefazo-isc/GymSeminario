import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { of } from "rxjs";
import { AppComponent } from "./app.component";
import { AuthService } from "./features/auth/data-access/auth.service";

describe("Application shell", () => {
  it("renders one header, a keyboard skip target and one footer around routed content", () => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: AuthService,
          useValue: { userName$: of(null), userRole$: of(null) },
        },
      ],
    });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelectorAll("app-navbar").length).toBe(1);
    expect(host.querySelectorAll("app-footer").length).toBe(1);
    expect(host.querySelector(".skip-link")?.getAttribute("href")).toBe(
      "#main-content",
    );
    expect(host.querySelector("main")?.getAttribute("tabindex")).toBe("-1");
    expect(host.querySelector("router-outlet")).not.toBeNull();
  });
});
