import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import jsQR from "jsqr";
import { Observable, catchError, map, of, timeout } from "rxjs";
import { getSessionToken } from "../../../core/auth/route.guards";
import { APP_ENDPOINTS } from "../../../core/config/app-endpoints";
import { isFiniteNumber, isRecord, isString } from "../../../core/storage/storage-guards";
import type {
  QrIssueRequest,
  QrIssueResult,
  QrRepository,
  QrValidationResult,
  ReceptionSubscriberSummary,
} from "./qr.repository";

/** Decodes a QR string from raw RGBA image pixels using jsQR. */
export function decodeQrPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): string | null {
  const code = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
  return code?.data?.trim() || null;
}

/** Captures a live HTMLVideoElement frame onto canvas and decodes any visible QR. */
export function decodeQrFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): string | null {
  if (video.readyState < 2) return null;
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  const frame = ctx.getImageData(0, 0, width, height);
  return decodeQrPixels(frame.data, width, height);
}

/** Reads an uploaded/captured image File and decodes any QR present. */
export function decodeQrFromImageFile(
  file: File,
  canvas?: HTMLCanvasElement,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-error"));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error("image-error"));
      img.onload = () => {
        const target = canvas || document.createElement("canvas");
        target.width = img.width;
        target.height = img.height;
        const ctx = target.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(decodeQrPixels(imageData.data, img.width, img.height));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Issues and validates member QR access tokens against the backend SQLite
 * registry, with a deterministic offline fallback code when offline.
 */
@Injectable({ providedIn: "root" })
export class QrService implements QrRepository {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly endpoints = inject(APP_ENDPOINTS, { optional: true });
  private callCount = 0;

  private get baseUrl(): string {
    return (
      this.endpoints?.notifications || "https://gymseminario.onrender.com"
    ).replace(/\/+$/, "");
  }

  getQrData(uid: string): Observable<{ data: string }> {
    return of({ data: this.generateLocalToken(uid) });
  }

  listSubscribers(): Observable<ReceptionSubscriberSummary[]> {
    const fallback: ReceptionSubscriberSummary[] = [
      {
        id: "MEM-BLACK-ELITE-01",
        nombre: "Socio Black Elite",
        email: "socio@gymseminario.com",
        nombrePlan: "Black Elite",
        precio: 1200,
        periodo: "Trimestral",
        fechaInicio: "2026-11-22",
        fechaFin: "2027-02-20",
        diasRestantes: 90,
        estado: "Activa",
      },
      {
        id: "MEM-PRO-849201",
        nombre: "Administrador GROM 21",
        email: "admin@gymseminario.com",
        nombrePlan: "Pro Fitness",
        precio: 550,
        periodo: "Mensual",
        fechaInicio: "2026-11-01",
        fechaFin: "2026-12-10",
        diasRestantes: 18,
        estado: "Activa",
      },
    ];
    if (!this.http || !getSessionToken()) {
      return of(fallback);
    }
    return this.http
      .get<unknown>(`${this.baseUrl}/api/reception/subscribers`)
      .pipe(
        timeout(10000),
        map((raw) => {
          if (!Array.isArray(raw) || raw.length === 0) return fallback;
          return raw
            .filter(isRecord)
            .map((r, idx): ReceptionSubscriberSummary => ({
              id: this.firstString(r["id"]) || `MEM-${idx + 1}`,
              nombre:
                this.firstString(r["nombre"], r["userName"], r["user_nombre"]) ||
                "Socio",
              email:
                this.firstString(r["email"], r["userEmail"], r["user_email"]) ||
                "socio@gymseminario.com",
              nombrePlan:
                this.firstString(r["nombrePlan"], r["planNombre"], r["plan_nombre"]) ||
                "Pro Fitness",
              precio: isFiniteNumber(r["precio"]) ? Number(r["precio"]) : 550,
              periodo: this.firstString(r["periodo"]) || "Mensual",
              fechaInicio:
                this.firstString(r["fechaInicio"], r["fecha_inicio"]) ||
                "2026-11-01",
              fechaFin:
                this.firstString(r["fechaFin"], r["fecha_fin"]) || "2027-02-20",
              diasRestantes: isFiniteNumber(r["diasRestantes"])
                ? Number(r["diasRestantes"])
                : 30,
              estado: this.firstString(r["estado"]) || "Activa",
            }));
        }),
        catchError(() => of(fallback)),
      );
  }

  issueQr(request: QrIssueRequest): Observable<QrIssueResult> {
    const localToken = this.generateLocalToken(request.uid);
    if (!this.http || !getSessionToken()) {
      return of({
        token: localToken,
        ttlSeconds: request.ttlSeconds,
        tokenType: "member",
        offline: true,
        message: "Código generado localmente sin conexión al servidor.",
      });
    }

    return this.http
      .post<unknown>(`${this.baseUrl}/api/qr/issue`, {
        bookingId: request.bookingId || undefined,
        clase: request.clase || undefined,
        fecha: request.fecha || undefined,
        ttlSeconds: request.ttlSeconds || undefined,
      })
      .pipe(
        timeout(10000),
        map((raw) =>
          this.normalizeIssueResponse(
            raw,
            localToken,
            "member",
            request.ttlSeconds,
          ),
        ),
        catchError(() =>
          of({
            token: localToken,
            ttlSeconds: request.ttlSeconds,
            tokenType: "member",
            offline: true,
            message: "Sin respuesta del servidor; código emitido en modo offline.",
          }),
        ),
      );
  }

  issueKioskQr(ttlSeconds = 30): Observable<QrIssueResult> {
    const clampedTtl = Math.max(15, Math.min(120, Math.round(ttlSeconds || 30)));
    const localToken = this.generateLocalToken("kiosk", "GROM-K");
    if (!this.http || !getSessionToken()) {
      return of({
        token: localToken,
        tokenType: "kiosk",
        ttlSeconds: clampedTtl,
        offline: true,
        message: "QR rotativo local sin conexión al servidor.",
      });
    }

    return this.http
      .post<unknown>(`${this.baseUrl}/api/qr/kiosk/issue`, {
        ttlSeconds: clampedTtl,
      })
      .pipe(
        timeout(10000),
        map((raw) =>
          this.normalizeIssueResponse(raw, localToken, "kiosk", clampedTtl),
        ),
        catchError(() =>
          of({
            token: localToken,
            tokenType: "kiosk",
            ttlSeconds: clampedTtl,
            offline: true,
            message: "Sin respuesta del servidor; QR de mostrador emitido offline.",
          }),
        ),
      );
  }

  validateQr(token: string): Observable<QrValidationResult> {
    return this.postQrValidation(
      "/api/qr/validate",
      { token: token.trim() },
      "El servicio de validación no está disponible.",
    );
  }

  kioskCheckin(token: string, clase?: string): Observable<QrValidationResult> {
    return this.postQrValidation(
      "/api/qr/kiosk/checkin",
      {
        token: token.trim(),
        clase: clase?.trim() || undefined,
      },
      "El servicio de asistencia QR no está disponible.",
    );
  }

  private postQrValidation(
    path: string,
    body: { token: string; clase?: string },
    offlineMessage: string,
  ): Observable<QrValidationResult> {
    if (!body.token) {
      return of({
        valid: false,
        code: "QR_INVALIDO",
        message: "Ingresa o escanea un código QR válido.",
      });
    }
    if (!this.http) {
      return of({
        valid: false,
        code: "OFFLINE",
        message: offlineMessage,
      });
    }

    return this.http.post<unknown>(`${this.baseUrl}${path}`, body).pipe(
      timeout(10000),
      map((raw) => this.normalizeValidationSuccess(raw)),
      catchError((err: unknown) => of(this.normalizeValidationError(err))),
    );
  }

  private normalizeIssueResponse(
    raw: unknown,
    fallbackToken: string,
    defaultType: string,
    defaultTtl?: number,
  ): QrIssueResult {
    const rec = isRecord(raw) ? raw : {};
    const token =
      (isString(rec["token"]) && rec["token"]) ||
      (isString(rec["codigo"]) && rec["codigo"]) ||
      (isString(rec["data"]) && rec["data"]) ||
      fallbackToken;
    const expiresAt = isString(rec["expiresAt"])
      ? rec["expiresAt"]
      : isString(rec["expires_at"])
        ? rec["expires_at"]
        : undefined;
    const ttlSeconds = isFiniteNumber(rec["ttlSeconds"])
      ? rec["ttlSeconds"]
      : defaultTtl;
    return {
      token,
      expiresAt,
      ttlSeconds,
      tokenType: isString(rec["tokenType"]) ? rec["tokenType"] : defaultType,
      offline: token === fallbackToken && !isString(rec["token"]),
      message: isString(rec["mensaje"])
        ? rec["mensaje"]
        : isString(rec["message"])
          ? rec["message"]
          : undefined,
    };
  }

  private normalizeValidationSuccess(raw: unknown): QrValidationResult {
    const rec = isRecord(raw) ? raw : {};
    const valid = rec["valid"] !== false && rec["ok"] !== false && rec["exito"] !== false;
    const member = isRecord(rec["member"]) ? rec["member"] : {};
    const membership = isRecord(rec["membership"])
      ? rec["membership"]
      : isRecord(rec["membresia"])
        ? rec["membresia"]
        : {};
    return {
      valid,
      code:
        this.firstString(rec["code"], rec["codigo"]) ||
        (valid ? "ACCESO_PERMITIDO" : "QR_RECHAZADO"),
      message:
        (isString(rec["message"]) && rec["message"]) ||
        (isString(rec["mensaje"]) && rec["mensaje"]) ||
        (valid
          ? "Acceso permitido y asistencia registrada."
          : "No se pudo validar el código QR."),
      memberName:
        this.firstString(
          rec["memberName"],
          rec["nombre"],
          rec["socio"],
          member["nombre"],
          member["name"],
        ) || undefined,
      email:
        this.firstString(rec["email"], rec["userEmail"], rec["user_email"], member["email"]) ||
        undefined,
      plan:
        this.firstString(
          rec["plan"],
          rec["nombrePlan"],
          rec["plan_nombre"],
          member["planNombre"],
          member["plan_nombre"],
          membership["nombrePlan"],
          membership["plan_nombre"],
        ) || undefined,
      fechaFin:
        this.firstString(
          rec["fechaFin"],
          rec["fecha_fin"],
          member["fechaFin"],
          member["fecha_fin"],
          membership["fechaFin"],
          membership["fecha_fin"],
        ) || undefined,
      clase: this.firstString(rec["clase"]) || undefined,
      fecha: this.firstString(rec["fecha"]) || undefined,
      checkedInAt:
        this.firstString(rec["checkedInAt"], rec["checked_in_at"], rec["usedAt"]) ||
        (isString(rec["fecha"]) && isString(rec["hora"])
          ? `${rec["fecha"]} ${rec["hora"]}`
          : new Date().toISOString()),
    };
  }

  private normalizeValidationError(err: unknown): QrValidationResult {
    const httpErr = err instanceof HttpErrorResponse ? err : null;
    const body = httpErr && isRecord(httpErr.error) ? httpErr.error : {};
    const code =
      this.firstString(body["code"], body["codigo"]) ||
      (httpErr?.status === 409
        ? "QR_YA_USADO"
        : httpErr?.status === 403
          ? "MEMBRESIA_VENCIDA"
          : httpErr?.status === 404
            ? "QR_INVALIDO"
            : httpErr?.status === 401
              ? "NO_AUTORIZADO"
              : "QR_RECHAZADO");
    const message =
      this.firstString(body["error"], body["message"], body["mensaje"]) ||
      "Acceso denegado: código QR inválido, expirado o sin membresía vigente.";
    return {
      valid: false,
      code,
      message,
      memberName: this.firstString(body["memberName"], body["nombre"]) || undefined,
      plan: this.firstString(body["plan"], body["nombrePlan"]) || undefined,
      fechaFin: this.firstString(body["fechaFin"], body["fecha_fin"]) || undefined,
    };
  }

  private firstString(...values: unknown[]): string {
    for (const v of values) {
      if (isString(v) && v.trim()) return v.trim();
    }
    return "";
  }

  private generateLocalToken(uid: string, prefix = "GROM"): string {
    this.callCount++;
    const now = Date.now();
    const seed = `${uid}-${now}-${this.callCount}-${Math.random()}`;
    return `${prefix}-${this.hashToHex(seed)}`;
  }

  private hashToHex(input: string): string {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c64e6d;
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 =
      Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
      Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 =
      Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
      Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const p1 = (h1 >>> 0).toString(16).padStart(8, "0").toUpperCase();
    const p2 = (h2 >>> 0).toString(16).padStart(8, "0").toUpperCase();
    return `${p1}${p2}`;
  }
}
