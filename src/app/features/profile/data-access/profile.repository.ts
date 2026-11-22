import { InjectionToken, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  BodyMeasurement,
  MeasurementInput,
  PerfilSocio,
} from "../models/profile.model";
import { PerfilSocioService } from "./perfil-socio.service";

export interface ProfileRepository {
  perfil$: Observable<PerfilSocio>;
  guardarPerfil(perfil: PerfilSocio): void | Promise<void>;
  actualizarNombre(nombre: string): void | Promise<void>;
  getSessionUserInfo?(): {
    email: string | null;
    nombre: string | null;
    role?: string | null;
  } | null;
  syncProfileFromServer?(): Promise<{
    perfil: PerfilSocio;
    healthAlerts: string[];
    synced: boolean;
  }>;
  loadMeasurements?(): Promise<{
    measurements: BodyMeasurement[];
    healthAlerts: string[];
  }>;
  saveMeasurement?(input: MeasurementInput): Promise<{
    measurement: BodyMeasurement;
    healthAlerts: string[];
  }>;
}

export const PROFILES = new InjectionToken<ProfileRepository>(
  "ProfileRepository",
  { providedIn: "root", factory: () => inject(PerfilSocioService) },
);
