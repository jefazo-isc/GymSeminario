import { InjectionToken, inject } from "@angular/core";
import { Observable } from "rxjs";
import { PerfilSocio } from "../../coach/models/rutina.model";
import { PerfilSocioService } from "./perfil-socio.service";
export interface ProfileRepository {
  perfil$: Observable<PerfilSocio>;
  guardarPerfil(perfil: PerfilSocio): void | Promise<void>;
  actualizarNombre(nombre: string): void | Promise<void>;
}
export const PROFILES = new InjectionToken<ProfileRepository>(
  "ProfileRepository",
  { providedIn: "root", factory: () => inject(PerfilSocioService) },
);
