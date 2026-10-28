import { InjectionToken, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  CoachInfo,
  MensajeChat,
  PerfilSocio,
  RespuestaChat,
  RespuestaRutina,
  RutinaData,
} from "../models/rutina.model";
import { RutinaService } from "./rutina.service";
export interface CoachRepository {
  generarRutina(perfil: PerfilSocio): Observable<RespuestaRutina>;
  obtenerCoaches(): Observable<CoachInfo[]>;
  enviarMensajeChat(
    coachId: string,
    mensaje: string,
    historial: MensajeChat[],
    contextoRutina?: RutinaData | null,
    perfilUsuario?: PerfilSocio,
  ): Observable<RespuestaChat>;
}
export const COACH = new InjectionToken<CoachRepository>("CoachRepository", {
  providedIn: "root",
  factory: () => inject(RutinaService),
});
