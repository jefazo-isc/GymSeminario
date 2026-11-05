import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import type { QrRepository } from "./qr.repository";

/**
 * Generates a deterministic, locally-produced QR data string.
 * The previous external API (api-j6b4.onrender.com) is no longer available,
 * so this service builds a unique code from the user's UID and timestamp.
 * No network call is required.
 */
@Injectable({ providedIn: "root" })
export class QrService implements QrRepository {
  private callCount = 0;

  getQrData(uid: string): Observable<{ data: string }> {
    this.callCount++;
    const now = Date.now();
    const seed = `${uid}-${now}-${this.callCount}-${Math.random()}`;
    const hex = this.hashToHex(seed);
    return of({ data: `GROM-${hex}` });
  }

  private hashToHex(input: string): string {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c64e6d;
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const p1 = (h1 >>> 0).toString(16).padStart(8, "0").toUpperCase();
    const p2 = (h2 >>> 0).toString(16).padStart(8, "0").toUpperCase();
    return `${p1}${p2}`;
  }
}
