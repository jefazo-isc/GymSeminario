import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { BehaviorSubject } from "rxjs";
import { SESSION } from "../../features/auth/data-access/session.repository";
import { QrService } from "../../features/training/data-access/qr.service";
import { QrViewComponent } from "../../features/training/ui/qr-view/qr-view.component";

describe("Local QR generation", () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [QrViewComponent],
    }),
  );

  it("generates a QR data string starting with GROM-", (done) => {
    TestBed.inject(QrService)
      .getQrData("unit-user")
      .subscribe({
        next: (result) => {
          expect(result.data).toMatch(/^GROM-[A-F0-9]+$/);
          done();
        },
        error: done.fail,
      });
  });

  it("generates unique codes for the same uid on separate calls", (done) => {
    const svc = TestBed.inject(QrService);
    let first = "";
    svc.getQrData("unit-user").subscribe((r) => {
      first = r.data;
    });
    svc.getQrData("unit-user").subscribe((r2) => {
      expect(r2.data).not.toBe(first);
      done();
    });
  });

  it("keeps the QR contract and clears the previous user code after logout", () => {
    const uid$ = new BehaviorSubject<string | null>("unit-user");
    TestBed.overrideProvider(SESSION, { useValue: { userUid$: uid$ } });
    const fixture = TestBed.createComponent(QrViewComponent);
    fixture.componentRef.setInput("clase", "Yoga");
    fixture.componentRef.setInput("fecha", "2026-10-28");
    fixture.detectChanges();

    expect(fixture.componentInstance.qrValue).toMatch(
      /^GROM-.+-Yoga-2026-10-28$/,
    );

    uid$.next(null);
    fixture.detectChanges();
    expect(fixture.componentInstance.qrValue).toBeNull();
    expect(fixture.componentInstance.error).toContain("sesión");
  });
});

describe("Server QR issue and door validation", () => {
  let svc: QrService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem("gym_jwt", "jwt-unit-token");
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(QrService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem("gym_jwt");
  });

  it("issues a server-backed QR token via POST /api/qr/issue and falls back offline on failure", () => {
    let issuedToken = "";
    svc
      .issueQr({ uid: "u-1", clase: "Boxeo", fecha: "2026-11-22" })
      .subscribe((res) => {
        issuedToken = res.token;
        expect(res.offline).toBeFalse();
        expect(res.expiresAt).toBe("2026-11-23T00:00:00Z");
      });

    const req = http.expectOne((r) => r.url.endsWith("/api/qr/issue"));
    expect(req.request.method).toBe("POST");
    req.flush({
      ok: true,
      token: "GROM-SRV-999",
      expiresAt: "2026-11-23T00:00:00Z",
    });
    expect(issuedToken).toBe("GROM-SRV-999");

    let fallbackOffline = false;
    svc.issueQr({ uid: "u-1" }).subscribe((res) => {
      fallbackOffline = res.offline;
      expect(res.token).toMatch(/^GROM-[A-F0-9]+$/);
    });
    http
      .expectOne((r) => r.url.endsWith("/api/qr/issue"))
      .flush(null, { status: 503, statusText: "Offline" });
    expect(fallbackOffline).toBeTrue();
  });

  it("validates a QR token and maps structured 403/409 door rejection codes", () => {
    svc.validateQr("GROM-SRV-999").subscribe((res) => {
      expect(res.valid).toBeTrue();
      expect(res.code).toBe("ACCESO_CONCEDIDO");
      expect(res.memberName).toBe("Ana Pérez");
      expect(res.plan).toBe("Pro Fitness");
      expect(res.fechaFin).toBe("2026-12-31");
      expect(res.checkedInAt).toBe("2026-11-22 15:10");
    });

    const okReq = http.expectOne((r) => r.url.endsWith("/api/qr/validate"));
    expect(okReq.request.method).toBe("POST");
    expect(okReq.request.body).toEqual({ token: "GROM-SRV-999" });
    okReq.flush({
      ok: true,
      exito: true,
      codigo: "ACCESO_CONCEDIDO",
      fecha: "2026-11-22",
      hora: "15:10",
      clase: "Crossfit",
      mensaje: "Acceso autorizado y asistencia registrada.",
      member: {
        email: "ana@example.com",
        nombre: "Ana Pérez",
        planNombre: "Pro Fitness",
        fechaFin: "2026-12-31",
      },
    });

    svc.validateQr("GROM-USED").subscribe((res) => {
      expect(res.valid).toBeFalse();
      expect(res.code).toBe("QR_YA_USADO");
      expect(res.message).toContain("utilizado");
    });

    const errReq = http.expectOne((r) => r.url.endsWith("/api/qr/validate"));
    errReq.flush(
      { codigo: "QR_YA_USADO", error: "Este código QR ya fue utilizado." },
      { status: 409, statusText: "Conflict" },
    );
  });

  it("issues rotating kiosk QR tokens via /api/qr/kiosk/issue and checks in subscribers via /api/qr/kiosk/checkin", () => {
    svc.issueKioskQr(30).subscribe((res) => {
      expect(res.token).toBe("GROM-K-ABC123");
      expect(res.tokenType).toBe("kiosk");
      expect(res.ttlSeconds).toBe(30);
      expect(res.offline).toBeFalse();
    });

    const issueReq = http.expectOne((r) => r.url.endsWith("/api/qr/kiosk/issue"));
    expect(issueReq.request.method).toBe("POST");
    expect(issueReq.request.body).toEqual({ ttlSeconds: 30 });
    issueReq.flush({
      ok: true,
      exito: true,
      token: "GROM-K-ABC123",
      tokenType: "kiosk",
      ttlSeconds: 30,
      expiresAt: "2026-11-23T00:00:30Z",
    });

    svc.kioskCheckin("GROM-K-ABC123", "Boxeo").subscribe((res) => {
      expect(res.valid).toBeTrue();
      expect(res.code).toBe("ACCESO_CONCEDIDO");
      expect(res.memberName).toBe("Ana Pérez");
      expect(res.plan).toBe("Plan Pro");
      expect(res.clase).toBe("Boxeo");
    });

    const checkinReq = http.expectOne((r) =>
      r.url.endsWith("/api/qr/kiosk/checkin"),
    );
    expect(checkinReq.request.method).toBe("POST");
    expect(checkinReq.request.body).toEqual({
      token: "GROM-K-ABC123",
      clase: "Boxeo",
    });
    checkinReq.flush({
      ok: true,
      exito: true,
      codigo: "ACCESO_CONCEDIDO",
      mensaje: "Asistencia registrada mediante QR de mostrador.",
      clase: "Boxeo",
      fecha: "2026-11-22",
      hora: "15:40",
      member: {
        email: "ana@example.com",
        nombre: "Ana Pérez",
        planNombre: "Plan Pro",
        fechaFin: "2026-12-31",
      },
    });

    svc.kioskCheckin("GROM-K-EXPIRED", "Boxeo").subscribe((res) => {
      expect(res.valid).toBeFalse();
      expect(res.code).toBe("QR_EXPIRADO");
    });
    http
      .expectOne((r) => r.url.endsWith("/api/qr/kiosk/checkin"))
      .flush(
        { codigo: "QR_EXPIRADO", error: "El código QR ha expirado." },
        { status: 403, statusText: "Forbidden" },
      );
  });
});
