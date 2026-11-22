import { InjectionToken, inject } from "@angular/core";
import { Observable } from "rxjs";
import { QrService } from "./qr.service";

export interface QrIssueRequest {
  uid: string;
  bookingId?: string;
  clase?: string;
  fecha?: string;
  ttlSeconds?: number;
}

export interface QrIssueResult {
  token: string;
  expiresAt?: string;
  ttlSeconds?: number;
  tokenType?: string;
  offline: boolean;
  message?: string;
}

export interface QrValidationResult {
  valid: boolean;
  code: string;
  message: string;
  memberName?: string;
  email?: string;
  plan?: string;
  fechaFin?: string;
  clase?: string;
  fecha?: string;
  checkedInAt?: string;
}

export interface QrRepository {
  getQrData(uid: string): Observable<{ data: string }>;
  issueQr?(request: QrIssueRequest): Observable<QrIssueResult>;
  issueKioskQr?(ttlSeconds?: number): Observable<QrIssueResult>;
  validateQr?(token: string): Observable<QrValidationResult>;
  kioskCheckin?(token: string, clase?: string): Observable<QrValidationResult>;
}

export const QR_CODES = new InjectionToken<QrRepository>("QrRepository", {
  providedIn: "root",
  factory: () => inject(QrService),
});
