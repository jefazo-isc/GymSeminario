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

    expect(fixture.componentInstance.qrValue).toMatch(/^GROM-.+-Yoga-2026-10-28$/);

    uid$.next(null);
    fixture.detectChanges();
    expect(fixture.componentInstance.qrValue).toBeNull();
    expect(fixture.componentInstance.error).toContain("sesión");
  });
});
