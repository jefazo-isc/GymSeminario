import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";

/** Servicio legacy — reemplazado por AuthService con JWT */
@Injectable({ providedIn: "root" })
export class MicuentaService {
  getUserData(): Observable<Record<string, unknown> | null> {
    const raw = localStorage.getItem("gym_user");
    if (!raw) return of(null);
    try { return of(JSON.parse(raw)); } catch { return of(null); }
  }
}
