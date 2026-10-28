import { Injectable, inject } from "@angular/core";
import { BrowserStorage } from "../../../core/storage/browser-storage.service";
import { LegacySession, isLegacySession } from "../models/legacy-session.model";
@Injectable({ providedIn: "root" })
export class LegacySessionStore {
  private storage = inject(BrowserStorage);
  get user() {
    return this.storage.readText("usuarioActual");
  }
  get session() {
    return this.storage.read("ultimaSesion", isLegacySession, () => null);
  }
  login(user: string) {
    this.storage.writeText("usuarioActual", user);
  }
  save(session: LegacySession) {
    this.storage.write("ultimaSesion", session);
    this.storage.write("formTemplateData", session);
    this.storage.write("sesionesSeleccionadas", [session.sesiones]);
  }
  delete() {
    for (const key of [
      "ultimaSesion",
      "formTemplateData",
      "sesionesSeleccionadas",
    ])
      this.storage.remove(key);
  }
  logout() {
    this.storage.remove("usuarioActual");
    this.storage.remove("formTemplateData");
  }
}
