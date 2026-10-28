import { InjectionToken, inject } from "@angular/core";
import { Observable } from "rxjs";
import { QrService } from "./qr.service";
export interface QrRepository {
  getQrData(uid: string): Observable<{ data: string }>;
}
export const QR_CODES = new InjectionToken<QrRepository>("QrRepository", {
  providedIn: "root",
  factory: () => inject(QrService),
});
