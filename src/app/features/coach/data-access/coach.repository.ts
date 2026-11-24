import { InjectionToken, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  CoachChatContext,
  CoachInfo,
  MensajeChat,
  PerfilSocio,
  RespuestaChat,
  RespuestaRutina,
  RespuestaVozCoach,
  RutinaData,
  SavedRoutineRecord,
  SaveRoutinePayload,
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
    extraContext?: CoachChatContext,
  ): Observable<RespuestaChat>;
  sintetizarVozCoach?(
    coachId: string,
    texto: string,
  ): Observable<RespuestaVozCoach>;
  leerPreferenciaAutoVoz?(): boolean;
  guardarPreferenciaAutoVoz?(activa: boolean): void;
  getRoutines?(targetEmail?: string): Observable<SavedRoutineRecord[]>;
  saveRoutine?(payload: SaveRoutinePayload): Observable<SavedRoutineRecord>;
  updateRoutine?(
    id: string | number,
    payload: SaveRoutinePayload,
  ): Observable<SavedRoutineRecord>;
}

export const COACH = new InjectionToken<CoachRepository>("CoachRepository", {
  providedIn: "root",
  factory: () => inject(RutinaService),
});
