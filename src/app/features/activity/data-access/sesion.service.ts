import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import {
  BehaviorSubject,
  Observable,
  catchError,
  firstValueFrom,
  of,
  timeout,
} from "rxjs";
import { readGymUser } from "../../../core/auth/route.guards";
import { APP_ENDPOINTS } from "../../../core/config/app-endpoints";
import { localDate } from "../../../core/date/local-date";
import { BrowserStorage } from "../../../core/storage/browser-storage.service";
import {
  isFiniteNumber,
  isList,
  isRecord,
  isString,
} from "../../../core/storage/storage-guards";
import {
  AlertaVencimiento,
  OcupacionHorario,
  SesionHistorial,
  WorkoutLogDraft,
  WorkoutLogEntry,
} from "../models/sesion.model";
import { isAlert, isSession, isWorkoutLog } from "../models/storage.guard";
import type { ActivityRepository } from "./activity.repository";

@Injectable({ providedIn: "root" })
export class SesionService implements ActivityRepository {
  private readonly storage = inject(BrowserStorage);
  private readonly http = inject(HttpClient, { optional: true });
  private readonly endpoints = inject(APP_ENDPOINTS, { optional: true });

  private readonly keyHistorial = "espacio_gym_historial_sesiones";
  private readonly keyAlertas = "espacio_gym_alertas";
  private readonly keyWorkoutLogs = "espacio_gym_workout_logs";

  private readonly ocupacionSubject = new BehaviorSubject<OcupacionHorario[]>(
    this.getOcupacionHorarios(),
  );
  private readonly historialSubject = new BehaviorSubject<SesionHistorial[]>(
    this.cargarHistorial(),
  );
  private readonly alertasSubject = new BehaviorSubject<AlertaVencimiento[]>(
    this.cargarAlertas(),
  );
  private readonly workoutLogsSubject = new BehaviorSubject<WorkoutLogEntry[]>(
    this.cargarWorkoutLogs(),
  );

  public readonly ocupacion$: Observable<OcupacionHorario[]> =
    this.ocupacionSubject.asObservable();
  public readonly historial$: Observable<SesionHistorial[]> =
    this.historialSubject.asObservable();
  public readonly alertas$: Observable<AlertaVencimiento[]> =
    this.alertasSubject.asObservable();
  public readonly workoutLogs$: Observable<WorkoutLogEntry[]> =
    this.workoutLogsSubject.asObservable();

  private get baseUrl(): string {
    return (
      this.endpoints?.notifications || "https://gymseminario.onrender.com"
    ).replace(/\/+$/, "");
  }

  async syncFromServer(): Promise<void> {
    if (!this.http) return;
    const user = readGymUser();
    const [availabilityRaw, bookingsRaw, attendancesRaw, membershipRaw] =
      await Promise.all([
        firstValueFrom(
          this.http
            .get<unknown>(`${this.baseUrl}/api/sessions/availability`)
            .pipe(
              timeout(8000),
              catchError(() => of(null)),
            ),
        ),
        firstValueFrom(
          this.http.get<unknown>(`${this.baseUrl}/api/bookings`).pipe(
            timeout(8000),
            catchError(() => of(null)),
          ),
        ),
        firstValueFrom(
          this.http.get<unknown>(`${this.baseUrl}/api/attendances`).pipe(
            timeout(8000),
            catchError(() => of(null)),
          ),
        ),
        user?.email
          ? firstValueFrom(
              this.http
                .get<unknown>(
                  `${this.baseUrl}/api/membership?email=${encodeURIComponent(user.email)}`,
                )
                .pipe(
                  timeout(8000),
                  catchError(() => of(null)),
                ),
            )
          : Promise.resolve(null),
      ]);

    const slots = this.normalizeAvailability(availabilityRaw);
    if (slots !== null) {
      this.ocupacionSubject.next(slots);
    }

    const sessions = this.normalizeRemoteSessions(
      bookingsRaw,
      attendancesRaw,
      user?.email ?? null,
      user?.uid ?? null,
    );
    if (sessions !== null) {
      this.saveHistorial(sessions);
    }

    const alerts = this.buildLiveAlerts(
      membershipRaw,
      sessions ?? this.historialSubject.value,
    );
    if (alerts !== null) {
      this.saveAlertas(alerts);
    }

    await this.loadWorkoutLogs();
  }

  async loadWorkoutLogs(): Promise<void> {
    if (!this.http) return;
    const raw = await firstValueFrom(
      this.http.get<unknown>(`${this.baseUrl}/api/workout-logs`).pipe(
        timeout(8000),
        catchError(() => of(null)),
      ),
    );
    const logs = this.normalizeWorkoutLogs(raw);
    if (logs !== null) {
      this.saveWorkoutLogs(logs);
    }
  }

  async addWorkoutLog(draft: WorkoutLogDraft): Promise<WorkoutLogEntry> {
    const cleanDraft: WorkoutLogDraft = {
      ejercicio: draft.ejercicio.trim(),
      grupoMuscular: draft.grupoMuscular.trim(),
      series: Number(draft.series),
      repeticiones: Number(draft.repeticiones),
      pesoKg: Number(draft.pesoKg),
      rpe: draft.rpe !== undefined ? Number(draft.rpe) : undefined,
      fecha: draft.fecha || localDate(),
      notas: draft.notas?.trim() || undefined,
    };

    if (this.http) {
      const resp = await firstValueFrom(
        this.http
          .post<unknown>(`${this.baseUrl}/api/workout-logs`, cleanDraft)
          .pipe(timeout(8000)),
      );
      const normalized = this.normalizeWorkoutEntry(resp);
      const created: WorkoutLogEntry = normalized ?? {
        ...cleanDraft,
        id: `wl-${Date.now()}`,
      };
      this.saveWorkoutLogs([created, ...this.workoutLogsSubject.value]);
      return created;
    }

    const localEntry: WorkoutLogEntry = {
      ...cleanDraft,
      id: `wl-${Date.now()}`,
    };
    this.saveWorkoutLogs([localEntry, ...this.workoutLogsSubject.value]);
    return localEntry;
  }

  async deleteWorkoutLog(id: string): Promise<void> {
    if (this.http) {
      await firstValueFrom(
        this.http
          .delete<unknown>(
            `${this.baseUrl}/api/workout-logs/${encodeURIComponent(id)}`,
          )
          .pipe(timeout(8000)),
      );
    }
    const updated = this.workoutLogsSubject.value.filter(
      (item) => item.id !== id,
    );
    this.saveWorkoutLogs(updated);
  }

  // ── Historial de Sesiones ─────────────────────────────────────────────
  getHistorial(): SesionHistorial[] {
    return structuredClone(this.historialSubject.value);
  }

  marcarAsistida(id: string): void {
    const updated = this.historialSubject.value.map((s) =>
      s.id === id ? { ...s, estado: "Asistida" as const } : s,
    );
    this.saveHistorial(updated);
  }

  cancelarSesion(id: string): void | Promise<void> {
    if (this.http && !/^s\d+$/.test(id)) {
      return firstValueFrom(
        this.http
          .delete<unknown>(
            `${this.baseUrl}/api/bookings/${encodeURIComponent(id)}`,
          )
          .pipe(timeout(8000)),
      ).then(() => {
        const updated = this.historialSubject.value.map((s) =>
          s.id === id ? { ...s, estado: "Cancelada" as const } : s,
        );
        this.saveHistorial(updated);
      });
    }
    const updated = this.historialSubject.value.map((s) =>
      s.id === id ? { ...s, estado: "Cancelada" as const } : s,
    );
    this.saveHistorial(updated);
  }

  // ── Ocupación por Horario ─────────────────────────────────────────────
  getOcupacionHorarios(): OcupacionHorario[] {
    return [
      {
        turno: "Mañana",
        hora: "06:00 – 08:00",
        capacidadMax: 20,
        inscritos: 19,
        clases: ["Spinning", "Yoga"],
      },
      {
        turno: "Mañana",
        hora: "08:00 – 10:00",
        capacidadMax: 25,
        inscritos: 21,
        clases: ["Crossfit", "Pesas"],
      },
      {
        turno: "Mañana",
        hora: "10:00 – 12:00",
        capacidadMax: 20,
        inscritos: 9,
        clases: ["Boxeo", "Yoga"],
      },
      {
        turno: "Tarde",
        hora: "14:00 – 16:00",
        capacidadMax: 25,
        inscritos: 15,
        clases: ["Pesas", "Crossfit"],
      },
      {
        turno: "Tarde",
        hora: "16:00 – 18:00",
        capacidadMax: 30,
        inscritos: 28,
        clases: ["Spinning", "Boxeo"],
      },
      {
        turno: "Tarde",
        hora: "18:00 – 20:00",
        capacidadMax: 30,
        inscritos: 30,
        clases: ["Crossfit", "Pesas"],
      },
      {
        turno: "Noche",
        hora: "20:00 – 21:30",
        capacidadMax: 20,
        inscritos: 12,
        clases: ["Yoga", "Spinning"],
      },
      {
        turno: "Noche",
        hora: "21:30 – 22:30",
        capacidadMax: 15,
        inscritos: 6,
        clases: ["Boxeo"],
      },
    ];
  }

  getPorcentajeOcupacion(o: OcupacionHorario): number {
    if (!o.capacidadMax) return 0;
    return Math.min(100, Math.round((o.inscritos / o.capacidadMax) * 100));
  }

  getNivelOcupacion(pct: number): "libre" | "moderado" | "lleno" {
    if (pct >= 90) return "lleno";
    if (pct >= 60) return "moderado";
    return "libre";
  }

  // ── Alertas de Vencimiento ────────────────────────────────────────────
  getAlertas(): AlertaVencimiento[] {
    return structuredClone(this.alertasSubject.value);
  }

  getAlertasSinLeer(): number {
    return this.alertasSubject.value.filter((a) => !a.leida).length;
  }

  marcarLeidaAlerta(id: string): void {
    const updated = this.alertasSubject.value.map((a) =>
      a.id === id ? { ...a, leida: true } : a,
    );
    this.saveAlertas(updated);
  }

  marcarTodasLeidas(): void {
    const updated = this.alertasSubject.value.map((a) => ({
      ...a,
      leida: true,
    }));
    this.saveAlertas(updated);
  }

  // ── Normalizadores ────────────────────────────────────────────────────
  private normalizeAvailability(raw: unknown): OcupacionHorario[] | null {
    if (raw === null) return null;
    const list = Array.isArray(raw)
      ? raw
      : isRecord(raw) && Array.isArray(raw["slots"])
        ? raw["slots"]
        : isRecord(raw) && Array.isArray(raw["availability"])
          ? raw["availability"]
          : null;
    if (!list) return null;

    const rows = list.filter(isRecord);
    const mapTurno = (val: unknown): "Mañana" | "Tarde" | "Noche" => {
      const lower = isString(val) ? val.toLowerCase() : "";
      if (lower.includes("vesp") || lower.includes("tard")) return "Tarde";
      if (lower.includes("noct") || lower.includes("noch")) return "Noche";
      return "Mañana";
    };
    const defaultHour: Record<"Mañana" | "Tarde" | "Noche", string> = {
      Mañana: "06:00 – 12:00",
      Tarde: "12:00 – 19:00",
      Noche: "19:00 – 22:30",
    };

    const hasExplicitHours = rows.some(
      (slot) => isString(slot["hora"]) || isString(slot["franja"]),
    );

    if (hasExplicitHours) {
      return rows.map((slot) => {
        const turno = mapTurno(slot["turno"]);
        const capacidadMax = isFiniteNumber(slot["capacidadMax"])
          ? slot["capacidadMax"]
          : isFiniteNumber(slot["capacidad"])
            ? slot["capacidad"]
            : 25;
        const inscritos = isFiniteNumber(slot["inscritos"])
          ? slot["inscritos"]
          : isFiniteNumber(slot["reservados"])
            ? slot["reservados"]
            : isFiniteNumber(slot["ocupados"])
              ? slot["ocupados"]
              : isFiniteNumber(slot["bookings"])
                ? slot["bookings"]
                : 0;
        const clases = Array.isArray(slot["clases"])
          ? slot["clases"].filter(isString)
          : isString(slot["disciplina"])
            ? [slot["disciplina"]]
            : isString(slot["clase"])
              ? [slot["clase"]]
              : ["General"];
        return {
          turno,
          hora: isString(slot["hora"])
            ? slot["hora"]
            : isString(slot["franja"])
              ? slot["franja"]
              : defaultHour[turno],
          capacidadMax,
          inscritos,
          clases,
        };
      });
    }

    const grouped = new Map<"Mañana" | "Tarde" | "Noche", OcupacionHorario>();
    for (const slot of rows) {
      const turno = mapTurno(slot["turno"]);
      const cap = isFiniteNumber(slot["capacidadMax"])
        ? slot["capacidadMax"]
        : isFiniteNumber(slot["capacidad"])
          ? slot["capacidad"]
          : 20;
      const res = isFiniteNumber(slot["inscritos"])
        ? slot["inscritos"]
        : isFiniteNumber(slot["reservados"])
          ? slot["reservados"]
          : isFiniteNumber(slot["ocupados"])
            ? slot["ocupados"]
            : isFiniteNumber(slot["bookings"])
              ? slot["bookings"]
              : 0;
      const disc = isString(slot["disciplina"])
        ? slot["disciplina"]
        : isString(slot["clase"])
          ? slot["clase"]
          : "";
      const bucket = grouped.get(turno) ?? {
        turno,
        hora: defaultHour[turno],
        capacidadMax: 0,
        inscritos: 0,
        clases: [],
      };
      bucket.capacidadMax += cap;
      bucket.inscritos += res;
      if (disc && !bucket.clases.includes(disc)) {
        bucket.clases.push(disc);
      }
      grouped.set(turno, bucket);
    }

    return Array.from(grouped.values()).map((item) => ({
      ...item,
      clases: item.clases.length ? item.clases : ["General"],
    }));
  }

  private normalizeRemoteSessions(
    bookingsRaw: unknown,
    attendancesRaw: unknown,
    userEmail: string | null,
    userUid: string | null,
  ): SesionHistorial[] | null {
    if (bookingsRaw === null && attendancesRaw === null) return null;
    const today = localDate();
    const normalizedEmail = (userEmail || "").toLowerCase().trim();
    const sessions: SesionHistorial[] = [];

    const extractList = (raw: unknown, key: string): Record<string, unknown>[] => {
      if (Array.isArray(raw)) return raw.filter(isRecord);
      if (isRecord(raw) && Array.isArray(raw[key])) {
        return (raw[key] as unknown[]).filter(isRecord);
      }
      if (isRecord(raw) && Array.isArray(raw["rows"])) {
        return (raw["rows"] as unknown[]).filter(isRecord);
      }
      return [];
    };

    const matchesUser = (row: Record<string, unknown>): boolean => {
      if (!normalizedEmail && !userUid) return true;
      const rowEmail = isString(row["email"])
        ? row["email"].toLowerCase().trim()
        : isString(row["user_email"])
          ? row["user_email"].toLowerCase().trim()
          : "";
      const rowUid =
        isString(row["usuario"]) || isFiniteNumber(row["usuario"])
          ? String(row["usuario"]).trim()
          : "";
      if (!rowEmail && !rowUid) return false;
      return (
        (Boolean(normalizedEmail) && rowEmail === normalizedEmail) ||
        (Boolean(userUid) && rowUid === userUid)
      );
    };

    if (bookingsRaw !== null) {
      for (const b of extractList(bookingsRaw, "bookings")) {
        if (!matchesUser(b)) continue;
        const fecha = isString(b["fecha"]) ? b["fecha"] : today;
        const turnoRaw = isString(b["turno"]) ? b["turno"] : "Mañana";
        const turnoLower = turnoRaw.toLowerCase();
        const turno = (
          ["Mañana", "Tarde", "Noche"].includes(turnoRaw)
            ? turnoRaw
            : turnoLower.includes("vesp") || turnoLower.includes("tard")
              ? "Tarde"
              : turnoLower.includes("noct") || turnoLower.includes("noch")
                ? "Noche"
                : "Mañana"
        ) as "Mañana" | "Tarde" | "Noche";
        const statusRaw = isString(b["estado"]) ? b["estado"] : "";
        const estado = (
          ["Reservada", "Asistida", "Cancelada", "Ausente"].includes(statusRaw)
            ? statusRaw
            : fecha >= today
              ? "Reservada"
              : "Asistida"
        ) as SesionHistorial["estado"];
        sessions.push({
          id: isString(b["id"]) ? b["id"] : String(b["id"] ?? ""),
          clase: isString(b["entrenamiento"])
            ? b["entrenamiento"]
            : "Entrenamiento",
          fecha,
          turno,
          estado,
          entrenador: isString(b["entrenador"]) ? b["entrenador"] : undefined,
          sala: isString(b["sala"]) ? b["sala"] : "Área principal",
        });
      }
    }

    if (attendancesRaw !== null) {
      for (const a of extractList(attendancesRaw, "attendances")) {
        if (!matchesUser(a)) continue;
        const fecha = isString(a["fecha"]) ? a["fecha"] : today;
        const hora = isString(a["hora"]) ? a["hora"] : "08:00";
        const hourNum = Number.parseInt(hora.split(":")[0] || "8", 10);
        const turno: "Mañana" | "Tarde" | "Noche" =
          hourNum < 13 ? "Mañana" : hourNum < 19 ? "Tarde" : "Noche";
        sessions.push({
          id: isString(a["id"]) ? a["id"] : String(a["id"] ?? ""),
          clase: isString(a["clase"]) ? a["clase"] : "Asistencia",
          fecha,
          turno,
          estado: "Asistida",
          sala: "Check-in confirmado",
        });
      }
    }

    return sessions.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  private buildLiveAlerts(
    membershipRaw: unknown,
    sessions: SesionHistorial[],
  ): AlertaVencimiento[] | null {
    if (membershipRaw === null && sessions.length === 0) return null;
    const alerts: AlertaVencimiento[] = [];
    const todayStr = localDate();

    if (isRecord(membershipRaw) && isString(membershipRaw["fechaFin"])) {
      const fechaFin = membershipRaw["fechaFin"];
      const diffMs =
        new Date(`${fechaFin}T00:00:00`).getTime() -
        new Date(`${todayStr}T00:00:00`).getTime();
      const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const plan = isString(membershipRaw["nombrePlan"])
        ? membershipRaw["nombrePlan"]
        : "Membresía";
      if (dias <= 0) {
        alerts.push({
          id: "live-mem-expired",
          tipo: "membresia",
          prioridad: "alta",
          titulo: "Membresía vencida",
          mensaje: `Tu plan ${plan} venció el ${fechaFin}. Renueva para mantener tu acceso QR y Coach IA.`,
          fecha: fechaFin,
          diasRestantes: 0,
          leida: false,
        });
      } else if (dias <= 5) {
        alerts.push({
          id: "live-mem-expiring",
          tipo: "membresia",
          prioridad: "alta",
          titulo: "Membresía por vencer",
          mensaje: `Tu plan ${plan} vence en ${dias} días (${fechaFin}).`,
          fecha: fechaFin,
          diasRestantes: dias,
          leida: false,
        });
      } else {
        alerts.push({
          id: "live-mem-active",
          tipo: "membresia",
          prioridad: "baja",
          titulo: `Plan ${plan} activo`,
          mensaje: `Tu membresía está vigente hasta ${fechaFin} (${dias} días restantes).`,
          fecha: fechaFin,
          diasRestantes: dias,
          leida: true,
        });
      }
    }

    for (const s of sessions.filter((item) => item.estado === "Reservada").slice(0, 3)) {
      alerts.push({
        id: `live-ses-${s.id}`,
        tipo: "sesion",
        prioridad: "media",
        titulo: `Sesión próxima: ${s.clase}`,
        mensaje: `Reserva confirmada para el ${s.fecha} en turno ${s.turno}.`,
        fecha: s.fecha,
        diasRestantes: 1,
        leida: false,
      });
    }

    return alerts;
  }

  private normalizeWorkoutLogs(raw: unknown): WorkoutLogEntry[] | null {
    if (raw === null) return null;
    const list = Array.isArray(raw)
      ? raw
      : isRecord(raw) && Array.isArray(raw["logs"])
        ? raw["logs"]
        : isRecord(raw) && Array.isArray(raw["rows"])
          ? raw["rows"]
          : null;
    if (!list) return null;
    return list
      .map((item) => this.normalizeWorkoutEntry(item))
      .filter((item): item is WorkoutLogEntry => item !== null);
  }

  private normalizeWorkoutEntry(raw: unknown): WorkoutLogEntry | null {
    const rec =
      isRecord(raw) && isRecord(raw["log"])
        ? raw["log"]
        : isRecord(raw) && isRecord(raw["data"])
          ? raw["data"]
          : isRecord(raw)
            ? raw
            : null;
    if (!rec) return null;
    const ejercicio = isString(rec["ejercicio"])
      ? rec["ejercicio"]
      : isString(rec["exercise"])
        ? rec["exercise"]
        : "";
    if (!ejercicio) return null;
    const id =
      isString(rec["id"]) || isFiniteNumber(rec["id"])
        ? String(rec["id"])
        : `wl-${Date.now()}`;
    return {
      id,
      ejercicio,
      grupoMuscular: isString(rec["grupoMuscular"])
        ? rec["grupoMuscular"]
        : isString(rec["grupo_muscular"])
          ? rec["grupo_muscular"]
          : "General",
      series: Number(rec["series"] ?? 3) || 3,
      repeticiones: Number(rec["repeticiones"] ?? rec["reps"] ?? 10) || 10,
      pesoKg: Number(rec["pesoKg"] ?? rec["peso_kg"] ?? rec["peso"] ?? 0) || 0,
      rpe:
        rec["rpe"] !== undefined && rec["rpe"] !== null
          ? Number(rec["rpe"])
          : undefined,
      fecha: isString(rec["fecha"]) ? rec["fecha"] : localDate(),
      notas: isString(rec["notas"]) ? rec["notas"] : undefined,
    };
  }

  // ── Persistencia ──────────────────────────────────────────────────────
  private saveHistorial(data: SesionHistorial[]): void {
    this.storage.write(this.keyHistorial, data);
    this.historialSubject.next(data);
  }

  private saveAlertas(data: AlertaVencimiento[]): void {
    this.storage.write(this.keyAlertas, data);
    this.alertasSubject.next(data);
  }

  private saveWorkoutLogs(data: WorkoutLogEntry[]): void {
    this.storage.write(this.keyWorkoutLogs, data);
    this.workoutLogsSubject.next(data);
  }

  private cargarHistorial(): SesionHistorial[] {
    return this.storage.read(this.keyHistorial, isList(isSession), () =>
      this.defaultSessions(),
    );
  }

  private cargarWorkoutLogs(): WorkoutLogEntry[] {
    return this.storage.read(this.keyWorkoutLogs, isList(isWorkoutLog), () => []);
  }

  private defaultSessions(): SesionHistorial[] {
    const hoy = new Date();
    const fecha = (dias: number): string => {
      const d = new Date(hoy);
      d.setDate(d.getDate() + dias);
      return localDate(d);
    };

    return [
      {
        id: "s1",
        clase: "Spinning",
        fecha: fecha(-30),
        turno: "Mañana",
        estado: "Asistida",
        entrenador: "Carlos R.",
        sala: "Sala A",
      },
      {
        id: "s2",
        clase: "Yoga",
        fecha: fecha(-25),
        turno: "Tarde",
        estado: "Asistida",
        entrenador: "Laura P.",
        sala: "Sala B",
      },
      {
        id: "s3",
        clase: "Crossfit",
        fecha: fecha(-18),
        turno: "Tarde",
        estado: "Cancelada",
        entrenador: "Diego M.",
        sala: "Área CrossFit",
      },
      {
        id: "s4",
        clase: "Pesas",
        fecha: fecha(-12),
        turno: "Noche",
        estado: "Asistida",
        entrenador: "Libre",
        sala: "Sala de Pesas",
      },
      {
        id: "s5",
        clase: "Boxeo",
        fecha: fecha(-7),
        turno: "Mañana",
        estado: "Asistida",
        entrenador: "Miguel A.",
        sala: "Ring",
      },
      {
        id: "s6",
        clase: "Spinning",
        fecha: fecha(-3),
        turno: "Tarde",
        estado: "Ausente",
        entrenador: "Carlos R.",
        sala: "Sala A",
      },
      {
        id: "s7",
        clase: "Crossfit",
        fecha: fecha(2),
        turno: "Mañana",
        estado: "Reservada",
        entrenador: "Diego M.",
        sala: "Área CrossFit",
      },
      {
        id: "s8",
        clase: "Yoga",
        fecha: fecha(5),
        turno: "Tarde",
        estado: "Reservada",
        entrenador: "Laura P.",
        sala: "Sala B",
      },
    ];
  }

  private cargarAlertas(): AlertaVencimiento[] {
    return this.storage.read(this.keyAlertas, isList(isAlert), () =>
      this.defaultAlerts(),
    );
  }

  private defaultAlerts(): AlertaVencimiento[] {
    const hoy = new Date();
    const fecha = (dias: number): string => {
      const d = new Date(hoy);
      d.setDate(d.getDate() + dias);
      return localDate(d);
    };

    return [
      {
        id: "a1",
        tipo: "membresia",
        prioridad: "alta",
        titulo: "Membresía por vencer",
        mensaje:
          "Tu plan Pro Fitness vence en 3 días. Renueva para no perder el acceso.",
        fecha: fecha(3),
        diasRestantes: 3,
        leida: false,
      },
      {
        id: "a2",
        tipo: "pago",
        prioridad: "alta",
        titulo: "Pago pendiente",
        mensaje: "Tienes una mensualidad sin liquidar. Folio GYM-849706.",
        fecha: fecha(0),
        diasRestantes: 0,
        leida: false,
      },
      {
        id: "a3",
        tipo: "sesion",
        prioridad: "media",
        titulo: "Sesión próxima",
        mensaje:
          "Tienes Crossfit reservado para el " + fecha(2) + " turno Mañana.",
        fecha: fecha(2),
        diasRestantes: 2,
        leida: false,
      },
      {
        id: "a4",
        tipo: "sesion",
        prioridad: "baja",
        titulo: "Sesión próxima",
        mensaje: "Tienes Yoga reservado para el " + fecha(5) + " turno Tarde.",
        fecha: fecha(5),
        diasRestantes: 5,
        leida: true,
      },
      {
        id: "a5",
        tipo: "membresia",
        prioridad: "baja",
        titulo: "Membresía renovada",
        mensaje: "Tu última renovación fue procesada exitosamente.",
        fecha: fecha(-10),
        diasRestantes: 0,
        leida: true,
      },
    ];
  }
}
