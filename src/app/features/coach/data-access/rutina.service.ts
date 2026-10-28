import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, Observable, timeout } from "rxjs";
import { APP_ENDPOINTS } from "../../../core/config/app-endpoints";
import { isRecord } from "../../../core/storage/storage-guards";
import { isChatResponse, isCoach, validRoutine } from "../models/rutina.guard";
import {
  CoachInfo,
  MensajeChat,
  PerfilSocio,
  RespuestaChat,
  RespuestaRutina,
  RutinaData,
} from "../models/rutina.model";
import type { CoachRepository } from "./coach.repository";

@Injectable({
  providedIn: "root",
})
export class RutinaService implements CoachRepository {
  private apiUrl = inject(APP_ENDPOINTS).coach;

  constructor(private http: HttpClient) {}

  /**
   * Envía el perfil del socio a la IA de Gemini para generar su rutina personalizada
   */
  generarRutina(perfil: PerfilSocio): Observable<RespuestaRutina> {
    return this.http.post<unknown>(`${this.apiUrl}/rutina`, perfil).pipe(
      timeout(60000),
      map((v) => {
        if (!isRecord(v) || typeof v["exito"] !== "boolean")
          throw new Error("Respuesta de rutina no válida.");
        if (v["exito"] === true && !validRoutine(v["data"]))
          throw new Error("Rutina no válida.");
        return v as unknown as RespuestaRutina;
      }),
    );
  }

  /**
   * Obtiene la lista de coaches disponibles
   */
  obtenerCoaches(): Observable<CoachInfo[]> {
    return this.http.get<unknown>(`${this.apiUrl}/coaches`).pipe(
      timeout(15000),
      map((v) => {
        if (!Array.isArray(v) || !v.every(isCoach))
          throw new Error("Catálogo de coaches no válido.");
        return v;
      }),
    );
  }

  /**
   * Envía mensaje al coach seleccionado con contexto y perfil biométrico
   */
  enviarMensajeChat(
    coachId: string,
    mensaje: string,
    historial: MensajeChat[],
    contextoRutina?: RutinaData | null,
    perfilUsuario?: PerfilSocio,
  ): Observable<RespuestaChat> {
    return this.http
      .post<unknown>(`${this.apiUrl}/coach/chat`, {
        coachId,
        mensaje,
        historial,
        contextoRutina,
        perfilUsuario,
      })
      .pipe(
        timeout(45000),
        map((v) => {
          if (!isChatResponse(v))
            throw new Error("Mensaje del coach no válido.");
          return v;
        }),
      );
  }
}
