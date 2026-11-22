import { HttpClient } from "@angular/common/http";
import { inject, Injectable, InjectionToken } from "@angular/core";
import { Observable, catchError, map, of, timeout } from "rxjs";
import { APP_ENDPOINTS } from "../../../core/config/app-endpoints";
import {
  isFiniteNumber,
  isRecord,
  isString,
} from "../../../core/storage/storage-guards";

export interface HourlyOccupancyPoint {
  hora: string;
  reservas: number;
  asistencias: number;
  total: number;
}

export interface DashboardAnalytics {
  byActivity: Record<string, number>;
  bookingsByActivity: Record<string, number>;
  attendancesByActivity: Record<string, number>;
  totalBookings: number;
  totalAttendances: number;
  activeMembers: number;
  totalRevenue: number;
  hourlyOccupancy: HourlyOccupancyPoint[];
}

export interface LiveSessionItem {
  id: string;
  clase: string;
  alumno: string;
  hora: string;
  fecha: string;
  plan?: string;
}

export interface LiveFloorResponse {
  activeCount: number;
  sessions: LiveSessionItem[];
  updatedAt: string;
}

export interface ForecastPeakWindow {
  franja: string;
  demandaEstimada: number;
  nivel: string;
  recomendacionPersonal: string;
}

export interface AnalyticsForecast {
  summary: string;
  peakHour: string;
  cleaningRecommendation: string;
  staffRecommendation: string;
  source: string;
  windows: ForecastPeakWindow[];
}

export interface AdminUserMembershipSummary {
  planNombre: string;
  estado: string;
  fechaFin: string;
}

export interface AdminMembershipAssignRequest {
  userEmail: string;
  planNombre: string;
  periodo: "Mensual" | "Trimestral" | "Anual";
  action?: "assign" | "renew" | "cancel";
  precio?: number;
}

export interface AdminUserRecord {
  uid: string | number;
  nombre: string;
  email: string;
  role: string;
  createdAt?: string;
  membresia?: AdminUserMembershipSummary | null;
}

export interface ExpiringMembership {
  id: string;
  userEmail: string;
  nombrePlan: string;
  fechaFin: string;
  diasRestantes: number;
  estado: string;
}

export interface StatisticsRepository {
  getStatistics(): Observable<Record<string, number>>;
  getDashboardAnalytics?(): Observable<DashboardAnalytics>;
  getLiveSessions?(): Observable<LiveFloorResponse>;
  getAnalyticsForecast?(): Observable<AnalyticsForecast>;
  getUsers?(): Observable<AdminUserRecord[]>;
  setUserRole?(userId: string | number, role: string): Observable<{ ok: boolean }>;
  assignUserMembership?(payload: AdminMembershipAssignRequest): Observable<{
    ok: boolean;
    mensaje: string;
    membresia?: AdminUserMembershipSummary | null;
  }>;
  getExpiringMemberships?(): Observable<ExpiringMembership[]>;
  notifyExpiringMemberships?(): Observable<{
    ok: boolean;
    sent: number;
    message: string;
  }>;
}

const KNOWN_ENRICHED_KEYS = new Set([
  "byActivity",
  "activities",
  "bookingsByActivity",
  "attendancesByActivity",
  "attendancesByDiscipline",
  "resumen",
  "summary",
  "totalBookings",
  "bookingsTotal",
  "totalAttendances",
  "attendancesTotal",
  "activeMembers",
  "activeMemberships",
  "membresiasActivas",
  "totalRevenue",
  "ingresosTotales",
  "revenue",
  "hourlyOccupancy",
  "porHora",
]);

@Injectable({ providedIn: "root" })
export class HttpStatisticsAdapter implements StatisticsRepository {
  private http = inject(HttpClient);
  private endpoints = inject(APP_ENDPOINTS);

  private get baseUrl(): string {
    if (this.endpoints.notifications) {
      return this.endpoints.notifications.replace(/\/+$/, "");
    }
    return this.endpoints.statistics.replace(/\/api\/sessions\/stats\/?$/, "");
  }

  getStatistics(): Observable<Record<string, number>> {
    return this.http.get<unknown>(this.endpoints.statistics).pipe(
      timeout(15000),
      map((data) => this.extractActivityStats(data)),
    );
  }

  getDashboardAnalytics(): Observable<DashboardAnalytics> {
    return this.http.get<unknown>(this.endpoints.statistics).pipe(
      timeout(15000),
      map((data) => this.normalizeDashboardAnalytics(data)),
    );
  }

  getLiveSessions(): Observable<LiveFloorResponse> {
    return this.http.get<unknown>(`${this.baseUrl}/api/sessions/live`).pipe(
      timeout(10000),
      map((raw) => {
        const rec = isRecord(raw) ? raw : {};
        const listRaw = Array.isArray(raw)
          ? raw
          : Array.isArray(rec["sessions"])
            ? rec["sessions"]
            : Array.isArray(rec["attendances"])
              ? rec["attendances"]
              : Array.isArray(rec["active"])
                ? rec["active"]
                : Array.isArray(rec["rows"])
                  ? rec["rows"]
                  : [];
        const sessions: LiveSessionItem[] = listRaw
          .filter(isRecord)
          .map((item) => ({
            id: isString(item["id"])
              ? item["id"]
              : String(item["id"] ?? Math.random()),
            clase: isString(item["clase"])
              ? item["clase"]
              : isString(item["entrenamiento"])
                ? item["entrenamiento"]
                : "Acceso general",
            alumno: isString(item["alumno"])
              ? item["alumno"]
              : isString(item["nombre"])
                ? item["nombre"]
                : isString(item["user_email"])
                  ? item["user_email"]
                  : "Socio",
            hora: isString(item["hora"])
              ? item["hora"]
              : isString(item["checkedInAt"])
                ? item["checkedInAt"]
                : "En piso",
            fecha: isString(item["fecha"]) ? item["fecha"] : "",
            plan: isString(item["plan"])
              ? item["plan"]
              : isString(item["nombrePlan"])
                ? item["nombrePlan"]
                : undefined,
          }));
        const activeCount = isFiniteNumber(rec["activeCount"])
          ? rec["activeCount"]
          : isFiniteNumber(rec["liveOccupancy"])
            ? rec["liveOccupancy"]
            : isFiniteNumber(rec["count"])
              ? rec["count"]
              : sessions.length;
        return {
          activeCount,
          sessions,
          updatedAt: isString(rec["updatedAt"])
            ? rec["updatedAt"]
            : new Date().toISOString(),
        };
      }),
    );
  }

  getAnalyticsForecast(): Observable<AnalyticsForecast> {
    return this.http
      .get<unknown>(`${this.baseUrl}/api/analytics/forecast`)
      .pipe(
        timeout(15000),
        map((raw) => {
          const rec = isRecord(raw) ? raw : {};
          const windowsRaw = Array.isArray(rec["windows"])
            ? rec["windows"]
            : Array.isArray(rec["franjas"])
              ? rec["franjas"]
              : [];
          let windows: ForecastPeakWindow[] = windowsRaw
            .filter(isRecord)
            .map((w) => ({
              franja: isString(w["franja"])
                ? w["franja"]
                : isString(w["hora"])
                  ? w["hora"]
                  : "18:00 – 20:00",
              demandaEstimada: Number(
                w["demandaEstimada"] ?? w["demanda"] ?? w["estimado"] ?? 0,
              ),
              nivel: isString(w["nivel"]) ? w["nivel"] : "medio",
              recomendacionPersonal: isString(w["recomendacionPersonal"])
                ? w["recomendacionPersonal"]
                : isString(w["recomendacion"])
                  ? w["recomendacion"]
                  : "Supervisión estándar",
            }));
          if (!windows.length && isRecord(rec["shiftDistribution"])) {
            const entries = Object.entries(rec["shiftDistribution"]).filter(
              ([, v]) => isFiniteNumber(v),
            ) as [string, number][];
            const maxVal = entries.reduce((acc, [, v]) => Math.max(acc, v), 0);
            windows = entries.map(([turno, demanda]) => ({
              franja: turno,
              demandaEstimada: demanda,
              nivel:
                demanda === maxVal && maxVal > 0
                  ? "alto"
                  : demanda > 0
                    ? "medio"
                    : "bajo",
              recomendacionPersonal:
                demanda === maxVal && maxVal > 0
                  ? "Refuerzo de recepción y 2 entrenadores de piso"
                  : "Supervisión estándar",
            }));
          }
          const peakHour = isString(rec["peakHour"])
            ? rec["peakHour"]
            : isString(rec["peakHourWindow"])
              ? rec["peakHourWindow"]
              : isString(rec["horaPico"])
                ? rec["horaPico"]
                : windows[0]?.franja || "18:00 – 20:00";
          const peakShift = isString(rec["peakShift"]) ? rec["peakShift"] : "";
          const topDiscipline = isString(rec["topDiscipline"])
            ? rec["topDiscipline"]
            : "";
          return {
            summary: isString(rec["summary"])
              ? rec["summary"]
              : isString(rec["resumen"])
                ? rec["resumen"]
                : peakShift
                  ? `Turno pico estimado: ${peakShift} (${peakHour}).${topDiscipline ? ` Disciplina líder: ${topDiscipline}.` : ""}`
                  : "Proyección de afluencia calculada con el historial de reservas y asistencias.",
            peakHour,
            cleaningRecommendation: isString(rec["cleaningRecommendation"])
              ? rec["cleaningRecommendation"]
              : isString(rec["recomendacionLimpieza"])
                ? rec["recomendacionLimpieza"]
                : "Programar sanitización de áreas de pesas y cardio antes de la franja pico.",
            staffRecommendation: isString(rec["staffRecommendation"])
              ? rec["staffRecommendation"]
              : isString(rec["staffingRecommendation"])
                ? rec["staffingRecommendation"]
                : isString(rec["recomendacionStaff"])
                  ? rec["recomendacionStaff"]
                  : "Reforzar recepción y entrenador de piso en horario vespertino.",
            source: isString(rec["source"])
              ? rec["source"]
              : isString(rec["origen"])
                ? rec["origen"]
                : "heuristic",
            windows,
          };
        }),
      );
  }

  getUsers(): Observable<AdminUserRecord[]> {
    return this.http.get<unknown>(`${this.baseUrl}/api/auth/users`).pipe(
      timeout(10000),
      map((raw) => {
        const list = Array.isArray(raw)
          ? raw
          : isRecord(raw) && Array.isArray(raw["users"])
            ? raw["users"]
            : [];
        return list.filter(isRecord).map((u) => ({
          uid: (u["uid"] ?? u["id"] ?? "") as string | number,
          nombre: isString(u["nombre"]) ? u["nombre"] : "Usuario",
          email: isString(u["email"]) ? u["email"] : "",
          role: isString(u["role"]) ? u["role"] : "user",
          createdAt: isString(u["createdAt"])
            ? u["createdAt"]
            : isString(u["created_at"])
              ? u["created_at"]
              : undefined,
          membresia: this.mapUserMembership(u["membresia"]),
        }));
      }),
    );
  }

  setUserRole(
    userId: string | number,
    role: string,
  ): Observable<{ ok: boolean }> {
    return this.http
      .post<unknown>(`${this.baseUrl}/api/auth/set-role`, { userId, role })
      .pipe(
        timeout(10000),
        map((raw) => ({
          ok: isRecord(raw) ? raw["ok"] !== false : true,
        })),
      );
  }

  assignUserMembership(payload: AdminMembershipAssignRequest): Observable<{
    ok: boolean;
    mensaje: string;
    membresia?: AdminUserMembershipSummary | null;
  }> {
    const email = payload.userEmail.trim().toLowerCase();
    const action = payload.action ?? "assign";
    return this.http
      .post<unknown>(`${this.baseUrl}/api/admin/memberships/assign`, {
        userEmail: email,
        email,
        planNombre: payload.planNombre,
        periodo: payload.periodo,
        action,
        ...(payload.precio !== undefined ? { precio: payload.precio } : {}),
      })
      .pipe(
        timeout(10000),
        map((raw) => {
          const rec = isRecord(raw) ? raw : {};
          return {
            ok: rec["ok"] !== false,
            mensaje: isString(rec["mensaje"])
              ? rec["mensaje"]
              : action === "cancel"
                ? `Membresía de ${email} cancelada.`
                : `Membresía ${payload.planNombre} asignada a ${email}.`,
            membresia: this.mapUserMembership(rec["membresia"]),
          };
        }),
      );
  }

  private mapUserMembership(raw: unknown): AdminUserMembershipSummary | null {
    if (!isRecord(raw)) return null;
    const planNombre = isString(raw["planNombre"])
      ? raw["planNombre"]
      : isString(raw["plan_nombre"])
        ? raw["plan_nombre"]
        : "";
    if (!planNombre) return null;
    return {
      planNombre,
      estado: isString(raw["estado"]) ? raw["estado"] : "Activa",
      fechaFin: isString(raw["fechaFin"])
        ? raw["fechaFin"]
        : isString(raw["fecha_fin"])
          ? raw["fecha_fin"]
          : "",
    };
  }

  getExpiringMemberships(): Observable<ExpiringMembership[]> {
    return this.http
      .get<unknown>(`${this.baseUrl}/api/admin/expiring-memberships`)
      .pipe(
        timeout(10000),
        map((raw) => {
          const list = Array.isArray(raw)
            ? raw
            : isRecord(raw) && Array.isArray(raw["memberships"])
              ? raw["memberships"]
              : isRecord(raw) && Array.isArray(raw["expiring"])
                ? raw["expiring"]
                : [];
          return list.filter(isRecord).map((m) => ({
            id: isString(m["id"]) ? m["id"] : String(m["id"] ?? ""),
            userEmail: isString(m["userEmail"])
              ? m["userEmail"]
              : isString(m["user_email"])
                ? m["user_email"]
                : "",
            nombrePlan: isString(m["nombrePlan"])
              ? m["nombrePlan"]
              : isString(m["plan_nombre"])
                ? m["plan_nombre"]
                : "Membresía",
            fechaFin: isString(m["fechaFin"])
              ? m["fechaFin"]
              : isString(m["fecha_fin"])
                ? m["fecha_fin"]
                : "",
            diasRestantes: Number(m["diasRestantes"] ?? m["dias_restantes"] ?? 0),
            estado: isString(m["estado"]) ? m["estado"] : "Por vencer",
          }));
        }),
        catchError(() => of([])),
      );
  }

  notifyExpiringMemberships(): Observable<{
    ok: boolean;
    sent: number;
    message: string;
  }> {
    return this.http
      .post<unknown>(`${this.baseUrl}/api/admin/notify-expiring`, {})
      .pipe(
        timeout(15000),
        map((raw) => {
          const rec = isRecord(raw) ? raw : {};
          const sent = Number(
            rec["sent"] ??
              rec["notifiedCount"] ??
              rec["enviados"] ??
              rec["notified"] ??
              0,
          );
          return {
            ok: rec["ok"] !== false && rec["exito"] !== false,
            sent,
            message: isString(rec["mensaje"])
              ? rec["mensaje"]
              : isString(rec["message"])
                ? rec["message"]
                : `Notificaciones enviadas (${sent} socios avisados).`,
          };
        }),
      );
  }

  private extractActivityStats(data: unknown): Record<string, number> {
    if (!isRecord(data)) {
      throw new Error("Estadísticas no válidas.");
    }
    const isEnriched = Object.keys(data).some((k) => KNOWN_ENRICHED_KEYS.has(k));
    if (!isEnriched) {
      if (!Object.values(data).every((v) => isFiniteNumber(v) && v >= 0)) {
        throw new Error("Estadísticas no válidas.");
      }
      return data as Record<string, number>;
    }

    const nested = isRecord(data["byActivity"])
      ? data["byActivity"]
      : isRecord(data["activities"])
        ? data["activities"]
        : null;
    if (nested) {
      const result: Record<string, number> = {};
      for (const [key, value] of Object.entries(nested)) {
        if (!isFiniteNumber(value) || value < 0) {
          throw new Error("Estadísticas no válidas.");
        }
        result[key] = value;
      }
      return result;
    }

    const flatActivity: Record<string, number> = {};
    for (const [key, value] of Object.entries(data)) {
      if (KNOWN_ENRICHED_KEYS.has(key)) continue;
      if (isFiniteNumber(value)) {
        if (value < 0) throw new Error("Estadísticas no válidas.");
        flatActivity[key] = value;
      }
    }
    return flatActivity;
  }

  private normalizeDashboardAnalytics(data: unknown): DashboardAnalytics {
    const byActivity = this.extractActivityStats(data);
    const rec = isRecord(data) ? data : {};
    const resumen = isRecord(rec["resumen"])
      ? rec["resumen"]
      : isRecord(rec["summary"])
        ? rec["summary"]
        : {};

    const toNumberMap = (src: unknown): Record<string, number> => {
      if (!isRecord(src)) return {};
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(src)) {
        if (isFiniteNumber(v) && v >= 0) out[k] = v;
      }
      return out;
    };

    const bookingsByActivity = Object.keys(toNumberMap(rec["bookingsByActivity"]))
      .length
      ? toNumberMap(rec["bookingsByActivity"])
      : byActivity;
    const rawAtt = toNumberMap(rec["attendancesByActivity"]);
    const attendancesByActivity = Object.keys(rawAtt).length
      ? rawAtt
      : toNumberMap(rec["attendancesByDiscipline"]);

    const hourlySource = rec["hourlyOccupancy"] ?? rec["porHora"];
    const hourlyOccupancy: HourlyOccupancyPoint[] = Array.isArray(hourlySource)
      ? hourlySource
          .filter(isRecord)
          .map((item) => ({
            hora: isString(item["hora"])
              ? item["hora"]
              : isString(item["franja"])
                ? item["franja"]
                : "",
            reservas: Number(item["reservas"] ?? item["bookings"] ?? 0),
            asistencias: Number(item["asistencias"] ?? item["attendances"] ?? 0),
            total: Number(item["total"] ?? 0),
          }))
          .filter((h) => Boolean(h.hora))
      : isRecord(hourlySource)
        ? Object.entries(hourlySource)
            .filter(([, value]) => isFiniteNumber(value))
            .map(([hora, value]) => {
              const total = Number(value);
              return { hora, reservas: total, asistencias: 0, total };
            })
        : [];

    const sumMap = (m: Record<string, number>) =>
      Object.values(m).reduce((acc, v) => acc + v, 0);

    return {
      byActivity,
      bookingsByActivity,
      attendancesByActivity,
      totalBookings: Number(
        rec["totalBookings"] ??
          rec["bookingsTotal"] ??
          resumen["totalBookings"] ??
          sumMap(bookingsByActivity),
      ),
      totalAttendances: Number(
        rec["totalAttendances"] ??
          rec["attendancesTotal"] ??
          resumen["totalAttendances"] ??
          sumMap(attendancesByActivity),
      ),
      activeMembers: Number(
        rec["activeMembers"] ??
          rec["activeMemberships"] ??
          rec["membresiasActivas"] ??
          resumen["activeMembers"] ??
          0,
      ),
      totalRevenue: Number(
        rec["totalRevenue"] ??
          rec["ingresosTotales"] ??
          rec["revenue"] ??
          resumen["totalRevenue"] ??
          0,
      ),
      hourlyOccupancy,
    };
  }
}

export const STATISTICS = new InjectionToken<StatisticsRepository>(
  "StatisticsRepository",
  { providedIn: "root", factory: () => inject(HttpStatisticsAdapter) },
);
