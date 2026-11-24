import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, Observable, timeout } from "rxjs";
import { readGymUser } from "../../../core/auth/route.guards";
import { APP_ENDPOINTS } from "../../../core/config/app-endpoints";
import { isRecord, isString } from "../../../core/storage/storage-guards";
import {
  isChatResponse,
  isCoach,
  isCoachTtsResponse,
  validRoutine,
} from "../models/rutina.guard";
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
import type { CoachRepository } from "./coach.repository";

@Injectable({
  providedIn: "root",
})
export class RutinaService implements CoachRepository {
  private apiUrl = inject(APP_ENDPOINTS).coach;

  constructor(private http: HttpClient) {}

  private getEmailHeaders(): Record<string, string> {
    const user = readGymUser();
    if (user?.email) {
      return { "X-User-Email": user.email.toLowerCase().trim() };
    }
    return {};
  }

  /**
   * Envía el perfil del socio a la IA de Gemini para generar su rutina personalizada
   */
  generarRutina(perfil: PerfilSocio): Observable<RespuestaRutina> {
    const headers = this.getEmailHeaders();
    const options = Object.keys(headers).length ? { headers } : undefined;
    return this.http
      .post<unknown>(`${this.apiUrl}/rutina`, perfil, options)
      .pipe(
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
    extraContext?: CoachChatContext,
  ): Observable<RespuestaChat> {
    const headers = this.getEmailHeaders();
    const options = Object.keys(headers).length ? { headers } : undefined;
    const body: Record<string, unknown> = {
      coachId,
      mensaje,
      historial,
      contextoRutina,
      perfilUsuario,
    };
    if (extraContext?.membershipSummary) {
      body["membershipSummary"] = extraContext.membershipSummary;
    }
    if (extraContext?.equipmentContext) {
      body["equipmentContext"] = extraContext.equipmentContext;
    }
    return this.http
      .post<unknown>(`${this.apiUrl}/coach/chat`, body, options)
      .pipe(
        timeout(45000),
        map((v) => {
          if (!isChatResponse(v))
            throw new Error("Mensaje del coach no válido.");
          return v;
        }),
      );
  }

  /**
   * Solicita al backend la síntesis o clonación de voz del coach para un mensaje
   */
  sintetizarVozCoach(
    coachId: string,
    texto: string,
  ): Observable<RespuestaVozCoach> {
    const headers = this.getEmailHeaders();
    const options = Object.keys(headers).length ? { headers } : undefined;
    return this.http
      .post<unknown>(`${this.apiUrl}/coach/tts`, { coachId, texto }, options)
      .pipe(
        timeout(28000),
        map((v) => {
          if (!isCoachTtsResponse(v))
            throw new Error("Respuesta de voz no válida.");
          return v;
        }),
      );
  }

  leerPreferenciaAutoVoz(): boolean {
    try {
      return localStorage.getItem("espaciogym_coach_autovoz") === "true";
    } catch {
      return false;
    }
  }

  guardarPreferenciaAutoVoz(activa: boolean): void {
    try {
      localStorage.setItem("espaciogym_coach_autovoz", String(Boolean(activa)));
    } catch {
      // Almacenamiento bloqueado por el navegador
    }
  }

  getRoutines(targetEmail?: string): Observable<SavedRoutineRecord[]> {
    const query = targetEmail?.trim()
      ? `?email=${encodeURIComponent(targetEmail.trim())}`
      : "";
    return this.http.get<unknown>(`${this.apiUrl}/routines${query}`).pipe(
      timeout(10000),
      map((raw) => {
        const list = Array.isArray(raw)
          ? raw
          : isRecord(raw) && Array.isArray(raw["routines"])
            ? raw["routines"]
            : isRecord(raw) && Array.isArray(raw["rows"])
              ? raw["rows"]
              : [];
        return list
          .map((item) => this.normalizeRoutineRecord(item))
          .filter((item): item is SavedRoutineRecord => item !== null);
      }),
    );
  }

  saveRoutine(payload: SaveRoutinePayload): Observable<SavedRoutineRecord> {
    const body = {
      ...payload,
      userEmail: payload.targetEmail?.trim() || undefined,
      titulo: payload.rutina.tituloRutina,
      objetivo: payload.rutina.objetivo,
      nivel: payload.rutina.nivelRecomendado,
    };
    return this.http.post<unknown>(`${this.apiUrl}/routines`, body).pipe(
      timeout(10000),
      map(
        (raw) =>
          this.normalizeRoutineRecord(raw) ?? {
            id: `rt-${Date.now()}`,
            userEmail: payload.targetEmail || readGymUser()?.email || "",
            assignedBy: payload.assignedBy ?? null,
            rutina: payload.rutina,
          },
      ),
    );
  }

  updateRoutine(
    id: string | number,
    payload: SaveRoutinePayload,
  ): Observable<SavedRoutineRecord> {
    const body = {
      ...payload,
      userEmail: payload.targetEmail?.trim() || undefined,
      titulo: payload.rutina.tituloRutina,
      objetivo: payload.rutina.objetivo,
      nivel: payload.rutina.nivelRecomendado,
    };
    return this.http
      .put<unknown>(
        `${this.apiUrl}/routines/${encodeURIComponent(String(id))}`,
        body,
      )
      .pipe(
        timeout(10000),
        map(
          (raw) =>
            this.normalizeRoutineRecord(raw) ?? {
              id,
              userEmail: payload.targetEmail || readGymUser()?.email || "",
              assignedBy: payload.assignedBy ?? null,
              rutina: payload.rutina,
            },
        ),
      );
  }

  private normalizeRoutineRecord(raw: unknown): SavedRoutineRecord | null {
    const rec =
      isRecord(raw) && isRecord(raw["routine"])
        ? raw["routine"]
        : isRecord(raw) && isRecord(raw["data"]) && !("diasSemana" in raw["data"])
          ? raw["data"]
          : isRecord(raw)
            ? raw
            : null;
    if (!rec) return null;

    let rutinaRaw: unknown =
      rec["rutina"] ?? rec["data"] ?? rec["routineData"] ?? rec["routine_json"];
    if (isString(rutinaRaw)) {
      try {
        rutinaRaw = JSON.parse(rutinaRaw);
      } catch {
        return null;
      }
    }
    if (!validRoutine(rutinaRaw)) return null;

    const id = rec["id"] ?? `rt-${Date.now()}`;
    return {
      id: typeof id === "number" || typeof id === "string" ? id : String(id),
      userEmail: isString(rec["userEmail"])
        ? rec["userEmail"]
        : isString(rec["user_email"])
          ? rec["user_email"]
          : "",
      assignedBy: isString(rec["assignedBy"])
        ? rec["assignedBy"]
        : isString(rec["assigned_by"])
          ? rec["assigned_by"]
          : null,
      updatedAt: isString(rec["updatedAt"])
        ? rec["updatedAt"]
        : isString(rec["updated_at"])
          ? rec["updated_at"]
          : undefined,
      rutina: rutinaRaw,
    };
  }
}
