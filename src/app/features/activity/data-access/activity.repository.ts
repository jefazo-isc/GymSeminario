import { InjectionToken, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  AlertaVencimiento,
  OcupacionHorario,
  SesionHistorial,
} from "../models/sesion.model";
import { SesionService } from "./sesion.service";
export interface ActivityRepository {
  historial$: Observable<SesionHistorial[]>;
  alertas$: Observable<AlertaVencimiento[]>;
  ocupacion$: Observable<OcupacionHorario[]>;
  marcarAsistida(id: string): void | Promise<void>;
  cancelarSesion(id: string): void | Promise<void>;
  getPorcentajeOcupacion(o: OcupacionHorario): number;
  getNivelOcupacion(pct: number): "libre" | "moderado" | "lleno";
  marcarLeidaAlerta(id: string): void | Promise<void>;
  marcarTodasLeidas(): void | Promise<void>;
}
export const ACTIVITY = new InjectionToken<ActivityRepository>(
  "ActivityRepository",
  { providedIn: "root", factory: () => inject(SesionService) },
);
