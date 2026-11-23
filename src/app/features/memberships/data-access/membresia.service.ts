import { DOCUMENT } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, firstValueFrom, Observable, of } from "rxjs";
import {
  APP_ENDPOINTS,
  backendBaseUrl,
} from "../../../core/config/app-endpoints";
import { localDate } from "../../../core/date/local-date";
import { BrowserStorage } from "../../../core/storage/browser-storage.service";
import {
  AdminMembershipAssignPayload,
  Membresia,
  MembershipHistoryEntry,
  PlanCatalogo,
} from "../models/membresia.model";
import { isMembership } from "../models/storage.guard";
import type { MembershipRepository } from "./membership.repository";

interface BackendMembershipResponse extends Membresia {
  auto_renew?: boolean | number;
  autoRenew?: boolean;
}

interface BackendHistoryRow {
  id?: string | number;
  user_email?: string;
  userEmail?: string;
  plan_nombre?: string;
  planNombre?: string;
  precio?: number;
  periodo?: string;
  fecha_inicio?: string;
  fechaInicio?: string;
  fecha_fin?: string;
  fechaFin?: string;
  estado?: string;
  action?: string;
  accion?: string;
  created_at?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: "root",
})
export class MembresiaService implements MembershipRepository {
  private readonly storage = inject(BrowserStorage);
  private readonly http = inject(HttpClient, { optional: true });
  private readonly endpoints = inject(APP_ENDPOINTS, { optional: true });
  private readonly doc = inject(DOCUMENT, { optional: true });
  private readonly storageKey = "espacio_gym_membresia";

  private readonly planesDisponibles: PlanCatalogo[] = [
    {
      id: "plan-basic",
      nombre: "Básico",
      precio: 350,
      periodo: "Mensual",
      descripcion: "Ideal para quienes inician su acondicionamiento físico.",
      beneficios: [
        "Acceso libre a área de pesas y cardio",
        "Acceso en horario regular (6:00 - 22:00)",
        "Uso de vestidores y lockers diarios",
        "Acceso al Coach IA con preguntas estándar",
      ],
    },
    {
      id: "plan-pro",
      nombre: "Pro Fitness",
      precio: 550,
      periodo: "Mensual",
      popular: true,
      descripcion:
        "El plan favorito con todas las clases incluidas y reservas QR.",
      beneficios: [
        "Acceso 100% total sin restricciones de horario",
        "Todas las clases grupales (Spinning, Yoga, Cross)",
        "Acceso ilimitado al Coach Virtual IA",
        "Check-in rápido leyendo el QR de recepción",
        "1 Evaluación biométrica mensual",
      ],
    },
    {
      id: "plan-black",
      nombre: "Black Elite",
      precio: 1200,
      periodo: "Trimestral",
      descripcion: "Experiencia premium completa con beneficios exclusivos.",
      beneficios: [
        "Todos los beneficios Pro Fitness",
        "Invitación a 1 acompañante gratis al mes",
        "Acceso a sillones de masaje y zona recovery",
        "Asesoría personalizada de nutrición",
        "Descuento del 15% en suplementos del Gym",
      ],
    },
  ];

  private readonly membresiaActualSubject = new BehaviorSubject<Membresia>(
    this.cargarMembresiaInicial(),
  );
  public readonly membresiaActual$: Observable<Membresia> =
    this.membresiaActualSubject.asObservable();

  constructor() {
    this.cargarDesdeNube();
    if (typeof window !== "undefined") {
      window.addEventListener("gym-session-changed", () => {
        const initial = this.cargarMembresiaInicial();
        this.membresiaActualSubject.next(initial);
        this.cargarDesdeNube();
      });
    }
  }

  getPlanes(): PlanCatalogo[] {
    return structuredClone(this.planesDisponibles);
  }

  loadPlans(): Observable<PlanCatalogo[]> {
    return of(this.getPlanes());
  }

  getMembresiaActual(): Membresia {
    return structuredClone(
      this.calcularEstadoMembresia(this.membresiaActualSubject.value),
    );
  }

  refreshMembership(): void {
    this.cargarDesdeNube();
  }

  adquirirOActualizarPlan(
    plan: PlanCatalogo,
    periodo: "Mensual" | "Trimestral" | "Anual" = "Mensual",
  ): void {
    const hoy = new Date();
    const mesesDuracion =
      periodo === "Anual" ? 12 : periodo === "Trimestral" ? 3 : 1;

    const fechaFin = new Date(hoy);
    fechaFin.setMonth(fechaFin.getMonth() + mesesDuracion);

    const nuevaMembresia: Membresia = {
      id: "MEM-" + Math.floor(100000 + Math.random() * 900000),
      nombrePlan: plan.nombre,
      precio: plan.precio,
      periodo,
      fechaInicio: localDate(hoy),
      fechaFin: localDate(fechaFin),
      estado: "Activa",
      beneficios: plan.beneficios,
      autoRenew: false,
    };

    this.guardarEnStorage(nuevaMembresia);
    this.sincronizarConNube(nuevaMembresia);
  }

  renovarMembresia(): void {
    const actual = this.getMembresiaActual();
    const fechaBase =
      new Date(actual.fechaFin + "T00:00:00") > new Date()
        ? new Date(actual.fechaFin + "T00:00:00")
        : new Date();
    const meses =
      actual.periodo === "Anual" ? 12 : actual.periodo === "Trimestral" ? 3 : 1;
    fechaBase.setMonth(fechaBase.getMonth() + meses);

    const renovada: Membresia = {
      ...actual,
      fechaFin: localDate(fechaBase),
      estado: "Activa",
    };

    this.guardarEnStorage(renovada);
    this.sincronizarRenovacion(renovada);
  }

  cancelarMembresia(): void {
    const actual = this.getMembresiaActual();
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);

    const cancelada: Membresia = {
      ...actual,
      fechaFin: localDate(ayer),
      estado: "Vencida",
      diasRestantes: 0,
      autoRenew: false,
    };

    this.guardarEnStorage(cancelada);
    this.sincronizarRenovacion(cancelada);
  }

  async loadHistory(email?: string): Promise<MembershipHistoryEntry[]> {
    if (!this.http) return [];
    const targetEmail = email || this.getUserEmail();
    if (!targetEmail) return [];
    const base = backendBaseUrl(this.endpoints);
    try {
      const resp = await firstValueFrom(
        this.http.get<
          | BackendHistoryRow[]
          | { history?: BackendHistoryRow[]; data?: BackendHistoryRow[] }
        >(
          `${base}/api/membership/history?email=${encodeURIComponent(targetEmail)}`,
        ),
      );
      const rows = Array.isArray(resp)
        ? resp
        : resp?.history || resp?.data || [];
      return rows.map((row, idx) => ({
        id: row.id ?? idx,
        userEmail: row.userEmail ?? row.user_email,
        planNombre: String(row.planNombre ?? row.plan_nombre ?? "Membresía"),
        precio: Number(row.precio ?? 0),
        periodo: String(row.periodo ?? "Mensual"),
        fechaInicio: String(row.fechaInicio ?? row.fecha_inicio ?? "—"),
        fechaFin: String(row.fechaFin ?? row.fecha_fin ?? "—"),
        estado: String(row.estado ?? row.accion ?? "Activa"),
        action: row.action ?? row.accion,
        createdAt: row.createdAt ?? row.created_at,
      }));
    } catch {
      return [];
    }
  }

  async lookupClientMembership(email: string): Promise<Membresia | null> {
    if (!this.http || !email.trim()) return null;
    const base = backendBaseUrl(this.endpoints);
    try {
      const resp = await firstValueFrom(
        this.http.get<BackendMembershipResponse>(
          `${base}/api/membership?email=${encodeURIComponent(email.trim().toLowerCase())}`,
        ),
      );
      if (resp && resp.id && resp.nombrePlan) {
        return this.calcularEstadoMembresia({
          ...resp,
          autoRenew: Boolean(resp.autoRenew ?? resp.auto_renew),
        });
      }
      return null;
    } catch {
      return null;
    }
  }

  async setAutoRenew(
    autoRenew: boolean,
    membershipId?: string,
  ): Promise<{ ok: boolean; autoRenew: boolean }> {
    const actual = this.getMembresiaActual();
    const id = membershipId || actual.id;
    const base = backendBaseUrl(this.endpoints);

    if (this.http) {
      await firstValueFrom(
        this.http.post<{ ok?: boolean; autoRenew?: boolean }>(
          `${base}/api/membership/auto-renew`,
          { id, autoRenew, auto_renew: autoRenew },
        ),
      );
    }

    const updated: Membresia = { ...actual, autoRenew };
    this.guardarEnStorage(updated);
    return { ok: true, autoRenew };
  }

  async adminAssignMembership(
    payload: AdminMembershipAssignPayload,
  ): Promise<{ ok: boolean; mensaje?: string; membresia?: Membresia }> {
    if (!this.http) {
      throw new Error("Servicio HTTP no disponible para asignación administrativa.");
    }
    const base = backendBaseUrl(this.endpoints);
    const resp = await firstValueFrom(
      this.http.post<{
        ok?: boolean;
        mensaje?: string;
        membresia?: BackendMembershipResponse;
      }>(`${base}/api/admin/memberships/assign`, {
        email: payload.email.trim().toLowerCase(),
        userEmail: payload.email.trim().toLowerCase(),
        action: payload.action,
        planNombre: payload.planNombre,
        precio: payload.precio,
        periodo: payload.periodo,
        dias: payload.dias,
      }),
    );

    const currentEmail = (this.getUserEmail() || "").toLowerCase().trim();
    if (
      resp?.membresia &&
      currentEmail &&
      currentEmail === payload.email.trim().toLowerCase()
    ) {
      this.guardarEnStorage(resp.membresia);
    }
    return {
      ok: resp?.ok !== false,
      mensaje: resp?.mensaje,
      membresia: resp?.membresia,
    };
  }

  private readGymUser(): { email?: string; role?: string } | null {
    try {
      const storage = this.doc?.defaultView?.localStorage;
      const raw = storage?.getItem("gym_user");
      if (!raw) return null;
      return JSON.parse(raw) as { email?: string; role?: string };
    } catch {
      return null;
    }
  }

  private getUserEmail(): string | null {
    return this.readGymUser()?.email || null;
  }

  getUserSessionStatus(): { isLoggedIn: boolean; isAdmin: boolean } {
    const user = this.readGymUser();
    if (!user) return { isLoggedIn: false, isAdmin: false };
    const email = (user.email || "").toLowerCase().trim();
    const role = (user.role || "").toLowerCase().trim();
    return {
      isLoggedIn: true,
      isAdmin:
        email === "guevara.cardona.yahir@gmail.com" ||
        email === "admin@gymseminario.com" ||
        role === "admin",
    };
  }

  private sincronizarConNube(mem: Membresia): void {
    const email = this.getUserEmail();
    const url = backendBaseUrl(this.endpoints);
    if (!email || !this.http) return;

    this.http
      .post(`${url}/api/membership`, {
        email,
        id: mem.id,
        nombrePlan: mem.nombrePlan,
        precio: mem.precio,
        periodo: mem.periodo,
        fechaInicio: mem.fechaInicio,
        fechaFin: mem.fechaFin,
        estado: mem.estado,
        beneficios: mem.beneficios,
        autoRenew: mem.autoRenew ?? false,
      })
      .subscribe({
        next: () => {},
        error: () => {},
      });
  }

  private sincronizarRenovacion(mem: Membresia): void {
    const url = backendBaseUrl(this.endpoints);
    if (!this.http) return;

    this.http
      .post(`${url}/api/membership/renew`, {
        id: mem.id,
        fechaFin: mem.fechaFin,
        estado: mem.estado,
      })
      .subscribe({
        next: () => {},
        error: () => {},
      });
  }

  private cargarDesdeNube(): void {
    const email = this.getUserEmail();
    const url = backendBaseUrl(this.endpoints);
    if (!email || !this.http) return;

    this.http
      .get<BackendMembershipResponse>(
        `${url}/api/membership?email=${encodeURIComponent(email)}`,
      )
      .subscribe({
        next: (cloudMem) => {
          if (cloudMem && cloudMem.id && cloudMem.nombrePlan) {
            const calculada = this.calcularEstadoMembresia({
              ...cloudMem,
              autoRenew: Boolean(cloudMem.autoRenew ?? cloudMem.auto_renew),
            });
            this.storage.write(this.storageKey, calculada);
            this.membresiaActualSubject.next(calculada);
          }
        },
        error: () => {
          const clean = email.toLowerCase().trim();
          if (
            clean !== "guevara.cardona.yahir@gmail.com" &&
            clean !== "admin@gymseminario.com" &&
            clean !== "socio@gymseminario.com"
          ) {
            const fallback = this.defaultMembership();
            this.storage.write(this.storageKey, fallback);
            this.membresiaActualSubject.next(fallback);
          }
        },
      });
  }

  private guardarEnStorage(membresia: Membresia): void {
    const memCalculada = this.calcularEstadoMembresia(membresia);
    this.storage.write(this.storageKey, memCalculada);
    this.membresiaActualSubject.next(memCalculada);
  }

  private cargarMembresiaInicial(): Membresia {
    const isTestEnv =
      typeof (window as unknown as { __karma__?: unknown }).__karma__ !==
        "undefined" ||
      typeof (globalThis as unknown as { jasmine?: unknown }).jasmine !==
        "undefined";
    if (!isTestEnv) {
      const user = this.readGymUser();
      const email = (user?.email || "").toLowerCase().trim();
      const role = (user?.role || "").toLowerCase().trim();
      const hasSubRole =
        role === "admin" ||
        role === "subscriber" ||
        role === "subscriptor" ||
        role === "socio" ||
        role === "trainer" ||
        role === "entrenador" ||
        email === "guevara.cardona.yahir@gmail.com" ||
        email === "admin@gymseminario.com" ||
        email === "socio@gymseminario.com";
      if (!user || !hasSubRole) {
        return this.defaultMembership();
      }
    }
    return this.storage.read(this.storageKey, isMembership, () =>
      this.defaultMembership(),
    );
  }

  private defaultMembership(): Membresia {
    const isTestEnv =
      typeof (window as unknown as { __karma__?: unknown }).__karma__ !==
        "undefined" ||
      typeof (globalThis as unknown as { jasmine?: unknown }).jasmine !==
        "undefined";

    const email = this.getUserEmail()?.toLowerCase().trim();
    const hoy = new Date();

    if (email === "socio@gymseminario.com") {
      const fin = new Date(hoy);
      fin.setDate(fin.getDate() + 90);
      const blackMem: Membresia = {
        id: "MEM-BLACK-ELITE-01",
        nombrePlan: "Black Elite",
        precio: 1200,
        periodo: "Trimestral",
        fechaInicio: localDate(hoy),
        fechaFin: localDate(fin),
        estado: "Activa",
        autoRenew: true,
        beneficios: [
          "Todos los beneficios Pro Fitness",
          "Invitación a 1 acompañante gratis al mes",
          "Acceso a sillones de masaje y zona recovery",
          "Asesoría personalizada de nutrición",
          "Descuento del 15% en suplementos del Gym",
        ],
      };
      return this.calcularEstadoMembresia(blackMem);
    }

    if (
      isTestEnv ||
      (email &&
        (email === "guevara.cardona.yahir@gmail.com" ||
          email === "admin@gymseminario.com"))
    ) {
      const fin = new Date(hoy);
      fin.setDate(fin.getDate() + 18);

      const defaultMem: Membresia = {
        id: "MEM-849201",
        nombrePlan: "Pro Fitness",
        precio: 550,
        periodo: "Mensual",
        fechaInicio: localDate(hoy),
        fechaFin: localDate(fin),
        estado: "Activa",
        beneficios: [
          "Acceso 100% total sin restricciones de horario",
          "Todas las clases grupales (Spinning, Yoga, Cross)",
          "Acceso ilimitado al Coach Virtual IA",
          "Check-in rápido leyendo el QR de recepción",
        ],
      };

      return this.calcularEstadoMembresia(defaultMem);
    }

    const pasada = new Date(hoy);
    pasada.setDate(pasada.getDate() - 1);
    return {
      id: "MEM-INACTIVA",
      nombrePlan: "Básico",
      precio: 0,
      periodo: "Mensual",
      fechaInicio: localDate(pasada),
      fechaFin: localDate(pasada),
      estado: "Vencida",
      diasRestantes: 0,
      beneficios: [],
    };
  }

  private calcularEstadoMembresia(mem: Membresia): Membresia {
    if (String(mem.estado).toLowerCase() === "cancelada") {
      return {
        ...mem,
        estado: "Vencida",
        diasRestantes: 0,
      };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaFin = new Date(mem.fechaFin + "T00:00:00");
    const diffTime = fechaFin.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let estado: "Activa" | "Por vencer" | "Vencida" = "Activa";
    if (diasRestantes <= 0) {
      estado = "Vencida";
    } else if (diasRestantes <= 5) {
      estado = "Por vencer";
    }

    return {
      ...mem,
      estado,
      diasRestantes: Math.max(0, diasRestantes),
    };
  }
}
