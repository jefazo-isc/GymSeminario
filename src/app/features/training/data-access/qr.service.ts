import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, timeout } from "rxjs";
import { APP_ENDPOINTS } from "../../../core/config/app-endpoints";
import type { QrRepository } from "./qr.repository";

@Injectable({ providedIn: "root" })
export class QrService implements QrRepository {
  private apiUrl = inject(APP_ENDPOINTS).qr; // endpoint correcto

  constructor(private http: HttpClient) {}

  getQrData(uid: string) {
    // Propagate transport failures. A fabricated string is not a valid access code.
    return this.http
      .get<unknown>(`${this.apiUrl}/${encodeURIComponent(uid)}`)
      .pipe(
        timeout(15000),
        map((response) => {
          if (
            !response ||
            typeof response !== "object" ||
            !("data" in response) ||
            typeof response.data !== "string" ||
            !response.data.trim()
          )
            throw new Error("Código externo no válido.");
          return { data: response.data };
        }),
      );
  }
}
