import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { BehaviorSubject } from "rxjs";
import { AuthService } from "../../features/auth/data-access/auth.service";
import { QrService } from "../../features/training/data-access/qr.service";
import { QrViewComponent } from "../../features/training/ui/qr-view/qr-view.component";

describe("External QR integrity", () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [QrViewComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it("propagates the real API error instead of returning a fabricated access string", () => {
    let next = false,
      failed = false;
    TestBed.inject(QrService)
      .getQrData("unit-user")
      .subscribe({ next: () => (next = true), error: () => (failed = true) });
    TestBed.inject(HttpTestingController)
      .expectOne("https://api-j6b4.onrender.com/api/user-qr/unit-user")
      .flush(null, { status: 503, statusText: "Unavailable" });
    expect(next).toBeFalse();
    expect(failed).toBeTrue();
  });
  it("keeps the QR contract and clears the previous user code after logout", () => {
    const uid = new BehaviorSubject<string | null>("unit-user");
    TestBed.overrideProvider(AuthService, { useValue: { userUid$: uid } });
    const fixture = TestBed.createComponent(QrViewComponent);
    fixture.componentRef.setInput("clase", "Yoga");
    fixture.componentRef.setInput("fecha", "2026-10-28");
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne("https://api-j6b4.onrender.com/api/user-qr/unit-user")
      .flush({ data: "UNIT-QR" });
    expect(fixture.componentInstance.qrValue).toBe("UNIT-QR-Yoga-2026-10-28");
    uid.next(null);
    expect(fixture.componentInstance.qrValue).toBeNull();
    expect(fixture.componentInstance.error).toContain("sesión");
  });
});
