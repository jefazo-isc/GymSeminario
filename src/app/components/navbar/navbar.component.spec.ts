import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { Dialog } from "@angular/cdk/dialog";
import { BehaviorSubject } from "rxjs";
import { NavbarComponent } from "./navbar.component";
import { AuthService } from "../../auth/data-access/auth.service";
import { SearchPanelComponent } from "../../shared/ui/search-panel/search-panel.component";

describe("NavbarComponent", () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let name: BehaviorSubject<string | null>;
  let role: BehaviorSubject<string | null>;
  beforeEach(() => {
    name = new BehaviorSubject<string | null>(null);
    role = new BehaviorSubject<string | null>(null);
    TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: AuthService,
          useValue: {
            userName$: name,
            userRole$: role,
            cerrarSesion: jasmine.createSpy().and.resolveTo(),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(Dialog).closeAll());

  it("switches from sign-in to the member menu when the existing auth stream changes", () => {
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector(".desktop-account")?.textContent).toContain(
      "Ingresar",
    );
    name.next("Martín Romo");
    role.next("socio");
    fixture.detectChanges();
    expect(
      host.querySelector(".account-trigger")?.getAttribute("aria-label"),
    ).toBe("Abrir menú de Martín Romo");
    expect(fixture.componentInstance.initials).toBe("MR");
  });

  it("exposes administrative links only for the explicit admin role", () => {
    name.next("Socio");
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector(
        ".account-trigger",
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(document.querySelector(".grom-menu")?.textContent).not.toContain(
      "Gestionar agendas",
    );
    TestBed.inject(Dialog).closeAll();
  });

  it("opens an accessible appearance dialog and shares the live theme", () => {
    fixture.componentInstance.openPreferences();
    fixture.detectChanges();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-labelledby")).toBe("appearance-title");
    expect(document.querySelectorAll('input[name="theme"]').length).toBe(3);
  });

  it("opens search from Control K without duplicating an existing dialog", () => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      cancelable: true,
    });
    fixture.componentInstance.handleShortcut(event);
    fixture.detectChanges();
    fixture.componentInstance.openSearch();
    const dialogs = TestBed.inject(Dialog).openDialogs;
    expect(event.defaultPrevented).toBeTrue();
    expect(dialogs.length).toBe(1);
    expect(
      dialogs[0].componentInstance instanceof SearchPanelComponent,
    ).toBeTrue();
  });

  it("opens and closes the mobile navigation with the same public routes", () => {
    (
      fixture.nativeElement.querySelector(
        ".mobile-menu-trigger",
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.mobileOpen()).toBeTrue();
    expect(
      document.querySelector('.mobile-navigation a[href="/coach-ia"]'),
    ).not.toBeNull();
    fixture.componentInstance.closeMobile();
    fixture.detectChanges();
    expect(fixture.componentInstance.mobileOpen()).toBeFalse();
  });
});
