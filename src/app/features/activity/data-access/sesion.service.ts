import { localDate } from "../../../core/date/local-date";
import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, Observable, defer, of } from "rxjs";
import { BrowserStorage } from "../../../core/storage/browser-storage.service";
import { isList } from "../../../core/storage/storage-guards";
import {
  AlertaVencimiento,
  OcupacionHorario,
  SesionHistorial,
} from "../models/sesion.model";
import { isAlert, isSession } from "../models/storage.guard";
import type { ActivityRepository } from "./activity.repository";

@Injectable({ providedIn: "root" })
export class SesionService implements ActivityRepository {
  readonly ocupacion$ = defer(() => of(this.getOcupacionHorarios()));
  private storage = inject(BrowserStorage);
  private keyHistorial = "espacio_gym_historial_sesiones";
  private keyAlertas = "espacio_gym_alertas";

  private historialSubject = new BehaviorSubject<SesionHistorial[]>(
    this.cargarHistorial(),
  );
  private alertasSubject = new BehaviorSubject<AlertaVencimiento[]>(
    this.cargarAlertas(),
  );

  public historial$: Observable<SesionHistorial[]> =
    this.historialSubject.asObservable();
  public alertas$: Observable<AlertaVencimiento[]> =
    this.alertasSubject.asObservable();

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

  cancelarSesion(id: string): void {
    const updated = this.historialSubject.value.map((s) =>
      s.id === id ? { ...s, estado: "Cancelada" as const } : s,
    );
    this.saveHistorial(updated);
  }

  // ── Ocupación por Horario (datos estáticos enriquecidos) ──────────────
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
    return Math.round((o.inscritos / o.capacidadMax) * 100);
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

  // ── Persistencia ──────────────────────────────────────────────────────
  private saveHistorial(data: SesionHistorial[]): void {
    this.storage.write(this.keyHistorial, data);
    this.historialSubject.next(data);
  }

  private saveAlertas(data: AlertaVencimiento[]): void {
    this.storage.write(this.keyAlertas, data);
    this.alertasSubject.next(data);
  }

  private cargarHistorial(): SesionHistorial[] {
    return this.storage.read(this.keyHistorial, isList(isSession), () =>
      this.defaultSessions(),
    );
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
        titulo: "⚠️ Membresía por vencer",
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
        titulo: "💳 Pago pendiente",
        mensaje: "Tienes una mensualidad sin liquidar. Folio GYM-849706.",
        fecha: fecha(0),
        diasRestantes: 0,
        leida: false,
      },
      {
        id: "a3",
        tipo: "sesion",
        prioridad: "media",
        titulo: "📅 Sesión próxima",
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
        titulo: "📅 Sesión próxima",
        mensaje: "Tienes Yoga reservado para el " + fecha(5) + " turno Tarde.",
        fecha: fecha(5),
        diasRestantes: 5,
        leida: true,
      },
      {
        id: "a5",
        tipo: "membresia",
        prioridad: "baja",
        titulo: "🎉 Membresía renovada",
        mensaje: "Tu última renovación fue procesada exitosamente.",
        fecha: fecha(-10),
        diasRestantes: 0,
        leida: true,
      },
    ];
  }
}
