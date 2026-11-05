import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import type { QrRepository } from "./qr.repository";

/**
 * Generates a deterministic, locally-produced QR data string.
 * The previous external API (api-j6b4.onrender.com) is no longer available,
 * so this service builds a unique code from the user's UID and a timestamp
 * using the Web Crypto API (SHA-256). No network call is required.
 */
@Injectable({ providedIn: "root" })
export class QrService implements QrRepository {
  getQrData(uid: string): Observable<{ data: string }> {
    const raw = `grom-${uid}-${Date.now()}`;
    // Use SubtleCrypto when available; fall back to a simple hash otherwise.
    if (typeof crypto !== "undefined" && crypto.subtle) {
      return new Observable((subscriber) => {
        const encoder = new TextEncoder();
        crypto.subtle
          .digest("SHA-256", encoder.encode(raw))
          .then((buf) => {
            const hex = Array.from(new Uint8Array(buf))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            subscriber.next({ data: `GROM-${hex.substring(0, 16).toUpperCase()}` });
            subscriber.complete();
          })
          .catch(() => {
            subscriber.next({ data: this.fallbackHash(raw) });
            subscriber.complete();
          });
      });
    }
    return of({ data: this.fallbackHash(raw) });
  }

  private fallbackHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return `GROM-${Math.abs(hash).toString(16).toUpperCase().padStart(8, "0")}`;
  }
}
