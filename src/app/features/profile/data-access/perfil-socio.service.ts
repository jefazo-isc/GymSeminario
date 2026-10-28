import { createProfileDraft } from "../models/profile.model";
import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { BrowserStorage } from "../../../core/storage/browser-storage.service";
import { PerfilSocio } from "../../coach/models/rutina.model";
import { isProfilePatch } from "../models/storage.guard";
import type { ProfileRepository } from "./profile.repository";

const STORAGE_KEY = "gym_perfil_socio";

@Injectable({
  providedIn: "root",
})
export class PerfilSocioService implements ProfileRepository {
  private storage = inject(BrowserStorage);
  private perfilDefault: PerfilSocio = createProfileDraft();

  private perfilSubject = new BehaviorSubject<PerfilSocio>(
    this.cargarPerfilInicial(),
  );
  public perfil$: Observable<PerfilSocio> = this.perfilSubject.asObservable();

  constructor() {}

  private cargarPerfilInicial(): PerfilSocio {
    return {
      ...this.perfilDefault,
      ...this.storage.read(STORAGE_KEY, isProfilePatch, () => ({})),
    };
  }

  getPerfilActual(): PerfilSocio {
    return { ...this.perfilSubject.getValue() };
  }

  guardarPerfil(nuevoPerfil: PerfilSocio): void {
    this.storage.write(STORAGE_KEY, nuevoPerfil);
    this.perfilSubject.next({ ...nuevoPerfil });
  }

  actualizarNombre(nombre: string): void {
    const actual = this.getPerfilActual();
    if (!actual.nombre || actual.nombre === "Socio") {
      actual.nombre = nombre;
      this.guardarPerfil(actual);
    }
  }
}
