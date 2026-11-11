import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { BehaviorSubject, firstValueFrom, Observable, timeout } from "rxjs";
import { APP_ENDPOINTS } from "../../../core/config/app-endpoints";
import {
  AttendanceDraft,
  AttendanceRecord,
  BookingCreate,
  BookingDraft,
  BookingRecord,
  NotificationIdentity,
  NotificationReceipt,
} from "../models/registration.model";
import type { TrainingRepository } from "./training.repository";

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadLS<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function saveLS<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

@Injectable({ providedIn: "root" })
export class FirestoreTrainingAdapter implements TrainingRepository {
  private http = inject(HttpClient);
  private endpoints = inject(APP_ENDPOINTS);

  private bookingsSubject = new BehaviorSubject<BookingRecord[]>(loadLS("gym_bookings"));
  private attendancesSubject = new BehaviorSubject<AttendanceRecord[]>(loadLS("gym_attendances"));

  bookings(): Observable<BookingRecord[]> {
    return this.bookingsSubject.asObservable();
  }

  attendances(): Observable<AttendanceRecord[]> {
    return this.attendancesSubject.asObservable();
  }

  async createBooking(data: BookingCreate): Promise<{ id: string }> {
    const id = nextId();
    const record: BookingRecord = { ...data, id } as unknown as BookingRecord;

    // Sincronizar en tiempo real con la base de datos SQLite central en Render
    try {
      const backendUrl = `${this.endpoints.notifications}/api/bookings`;
      await firstValueFrom(
        this.http.post<{ id: string }>(backendUrl, { ...data, id }).pipe(timeout(6000))
      );
    } catch (err) {
      console.warn("No se pudo persistir en backend de inmediato, manteniendo en caché:", err);
    }

    const updated = [...this.bookingsSubject.value, record];
    saveLS("gym_bookings", updated);
    this.bookingsSubject.next(updated);
    return { id };
  }

  async createAttendance(data: AttendanceDraft): Promise<{ id: string }> {
    const id = nextId();
    const record: AttendanceRecord = { ...data, id } as unknown as AttendanceRecord;

    // Sincronizar asistencia en tiempo real con SQLite central en Render
    try {
      const backendUrl = `${this.endpoints.notifications}/api/attendances`;
      await firstValueFrom(
        this.http.post<{ id: string }>(backendUrl, { ...data, id }).pipe(timeout(6000))
      );
    } catch (err) {
      console.warn("No se pudo persistir asistencia en backend de inmediato:", err);
    }

    const updated = [...this.attendancesSubject.value, record];
    saveLS("gym_attendances", updated);
    this.attendancesSubject.next(updated);
    return { id };
  }

  async updateBooking(id: string, data: BookingDraft & { nombre?: string | null }): Promise<void> {
    const updated = this.bookingsSubject.value.map((b) =>
      b.id === id ? { ...b, ...data } : b
    );
    saveLS("gym_bookings", updated);
    this.bookingsSubject.next(updated);
  }

  async updateAttendance(id: string, data: AttendanceDraft): Promise<void> {
    const updated = this.attendancesSubject.value.map((a) =>
      a.id === id ? { ...a, ...data } : a
    );
    saveLS("gym_attendances", updated);
    this.attendancesSubject.next(updated);
  }

  async deleteBooking(id: string): Promise<void> {
    const updated = this.bookingsSubject.value.filter((b) => b.id !== id);
    saveLS("gym_bookings", updated);
    this.bookingsSubject.next(updated);
  }

  async deleteAttendance(id: string): Promise<void> {
    const updated = this.attendancesSubject.value.filter((a) => a.id !== id);
    saveLS("gym_attendances", updated);
    this.attendancesSubject.next(updated);
  }

  private send(path: string, payload: object) {
    return firstValueFrom(
      this.http
        .post<unknown>(this.endpoints.notifications + path, payload)
        .pipe(timeout(20000)),
    );
  }

  async notifyBooking(user: NotificationIdentity, data: BookingDraft): Promise<NotificationReceipt> {
    if (user.email) {
      await this.send("/enviar-correo", {
        correo: user.email,
        nombre: user.displayName || "Usuario",
        ...data,
      });
      return "email";
    }
    if (user.phoneNumber) {
      await this.send("/enviar-sms", {
        telefono: user.phoneNumber,
        mensaje: `Gracias por enviar tu formulario.\nEntrenamiento: ${data.entrenamiento}\nFecha: ${data.fecha}\nTurno: ${data.turno}\n¡Nos vemos pronto!`,
      });
      return "sms";
    }
    return "no-contact";
  }

  async notifyAttendance(user: NotificationIdentity, data: AttendanceDraft, name: string | null): Promise<NotificationReceipt> {
    if (user.email) {
      await this.send("/enviar-asistencia", {
        correo: user.email,
        nombre: user.displayName || name || "Usuario",
        clase: data.clase,
        fecha: data.fecha,
        hora: data.hora,
      });
      return "email";
    }
    if (user.phoneNumber) {
      await this.send("/enviar-sms", {
        telefono: user.phoneNumber,
        mensaje: `Gracias por registrar tu asistencia.\nClase: ${data.clase}\nFecha: ${data.fecha}\nHora: ${data.hora}`,
      });
      return "sms";
    }
    return "no-contact";
  }
}
