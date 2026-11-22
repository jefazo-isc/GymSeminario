import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of } from "rxjs";
import { QR_CODES } from "../../data-access/qr.repository";
import { ScannerComponent } from "./scanner.component";

describe("ScannerComponent", () => {
  let fixture: ComponentFixture<ScannerComponent>;
  let component: ScannerComponent;
  let validateSpy: jasmine.Spy;

  beforeEach(async () => {
    localStorage.removeItem("gym_user");
    validateSpy = jasmine.createSpy("validateQr").and.returnValue(
      of({
        valid: true,
        code: "ACCESO_PERMITIDO",
        message: "Asistencia registrada en puerta.",
        memberName: "Socio Activo",
        plan: "Pro Fitness",
        fechaFin: "2026-12-31",
      }),
    );

    await TestBed.configureTestingModule({
      imports: [ScannerComponent],
      providers: [
        provideRouter([]),
        {
          provide: QR_CODES,
          useValue: {
            getQrData: () => of({ data: "GROM-LOCAL" }),
            validateQr: validateSpy,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem("gym_user");
  });

  it("validates a manual QR token and renders GREEN PASS details", () => {
    component.manualToken = "GROM-REAL-001";
    component.validarManual();
    fixture.detectChanges();

    expect(validateSpy).toHaveBeenCalledWith("GROM-REAL-001");
    expect(component.lastResult?.valid).toBeTrue();
    expect(
      fixture.nativeElement.querySelector(".scan-result--pass"),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain("Socio Activo");
    expect(component.history.length).toBe(1);
  });

  it("renders RED REJECT state when membership is expired or QR was already used", () => {
    validateSpy.and.returnValue(
      of({
        valid: false,
        code: "MEMBRESIA_VENCIDA",
        message: "La membresía del socio está vencida.",
      }),
    );

    component.manualToken = "GROM-EXPIRED";
    component.validarManual();
    fixture.detectChanges();

    expect(component.lastResult?.valid).toBeFalse();
    expect(
      fixture.nativeElement.querySelector(".scan-result--reject"),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain("MEMBRESIA_VENCIDA");
  });

  it("blocks non-reception/non-admin users when session is set", () => {
    localStorage.setItem(
      "gym_user",
      JSON.stringify({
        uid: "u-1",
        nombre: "Socio",
        email: "socio@example.com",
        role: "subscriber",
      }),
    );
    const blockedFixture = TestBed.createComponent(ScannerComponent);
    blockedFixture.detectChanges();

    expect(blockedFixture.componentInstance.esRecepcionOAdmin).toBeFalse();
    expect(blockedFixture.nativeElement.textContent).toContain(
      "Acceso restringido",
    );
    blockedFixture.componentInstance.validarToken("GROM-TEST");
    expect(validateSpy.calls.count()).toBe(0);
  });

  it("renders rotating desk QR when issueKioskQr is provided and omits /f3 link", () => {
    const issueKioskSpy = jasmine.createSpy("issueKioskQr").and.returnValue(
      of({
        token: "GROM-K-TEST30",
        tokenType: "kiosk",
        ttlSeconds: 30,
        expiresAt: "2026-11-23T00:00:30Z",
        offline: false,
      }),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ScannerComponent],
      providers: [
        provideRouter([]),
        {
          provide: QR_CODES,
          useValue: {
            getQrData: () => of({ data: "GROM-LOCAL" }),
            validateQr: validateSpy,
            issueKioskQr: issueKioskSpy,
          },
        },
      ],
    });
    localStorage.setItem(
      "gym_user",
      JSON.stringify({
        uid: "r-1",
        nombre: "Recepción",
        email: "recep@example.com",
        role: "reception",
      }),
    );

    const kioskFixture = TestBed.createComponent(ScannerComponent);
    kioskFixture.detectChanges();

    expect(issueKioskSpy).toHaveBeenCalledWith(30);
    expect(kioskFixture.componentInstance.kioskToken).toBe("GROM-K-TEST30");
    const host: HTMLElement = kioskFixture.nativeElement;
    expect(host.querySelector(".kiosk-qr-paper")).not.toBeNull();
    expect(host.querySelector('a[href="/editar2"]')).not.toBeNull();
    expect(host.querySelector('a[href="/f3"]')).toBeNull();
    expect(host.querySelector('a[href="/graficos"]')).toBeNull();
    expect(
      host.querySelector('input[type="file"]')?.getAttribute("capture"),
    ).toBe("environment");

    kioskFixture.componentInstance.rotateKioskQr();
    expect(issueKioskSpy.calls.count()).toBe(2);
  });
});
