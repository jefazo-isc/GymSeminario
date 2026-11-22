import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import {
  BehaviorSubject,
  Observable,
  catchError,
  firstValueFrom,
  map,
  of,
  tap,
  timeout,
} from "rxjs";
import { APP_ENDPOINTS } from "../../../core/config/app-endpoints";
import { isRecord, isString } from "../../../core/storage/storage-guards";
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

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadLS<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function saveLS<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore storage quota failures */
  }
}

@Injectable({ providedIn: "root" })
export class FirestoreTrainingAdapter implements TrainingRepository {
  private http = inject(HttpClient, { optional: true });
  private endpoints = inject(APP_ENDPOINTS);

  private bookingsSubject = new BehaviorSubject<BookingRecord[]>(
    loadLS("gym_bookings"),
  );
  private attendancesSubject = new BehaviorSubject<AttendanceRecord[]>(
    loadLS("gym_attendances"),
  );

  private get baseUrl(): string {
    return this.endpoints.notifications.replace(/\/+$/, "");
  }

  bookings(): Observable<BookingRecord[]> {
    if (!this.http) {
      return this.bookingsSubject.asObservable();
    }
    return this.http.get<unknown>(`${this.baseUrl}/api/bookings`).pipe(
      timeout(8000),
      map((raw) => this.normalizeBookings(raw)),
      tap((rows) => {
        saveLS("gym_bookings", rows);
        this.bookingsSubject.next(rows);
      }),
      catchError((err: unknown) => {
        const cached = loadLS<BookingRecord>("gym_bookings");
        if (cached.length) return of(cached);
        throw err;
      }),
    );
  }

  attendances(): Observable<AttendanceRecord[]> {
    if (!this.http) {
      return this.attendancesSubject.asObservable();
    }
    return this.http.get<unknown>(`${this.baseUrl}/api/attendances`).pipe(
      timeout(8000),
      map((raw) => this.normalizeAttendances(raw)),
      tap((rows) => {
        saveLS("gym_attendances", rows);
        this.attendancesSubject.next(rows);
      }),
      catchError((err: unknown) => {
        const cached = loadLS<AttendanceRecord>("gym_attendances");
        if (cached.length) return of(cached);
        throw err;
      }),
    );
  }

  async createBooking(data: BookingCreate): Promise<{ id: string }> {
    const id = nextId("bk");
    if (this.http) {
      const resp = await firstValueFrom(
        this.http
          .post<{ id?: string }>(`${this.baseUrl}/api/bookings`, { ...data, id })
          .pipe(timeout(8000)),
      );
      const createdId = resp?.id || id;
      const record: BookingRecord = { ...data, id: createdId };
      const updated = [record, ...this.bookingsSubject.value];
      saveLS("gym_bookings", updated);
      this.bookingsSubject.next(updated);
      return { id: createdId };
    }

    const record: BookingRecord = { ...data, id };
    const updated = [...this.bookingsSubject.value, record];
    saveLS("gym_bookings", updated);
    this.bookingsSubject.next(updated);
    return { id };
  }

  async createAttendance(data: AttendanceDraft): Promise<{ id: string }> {
    const id = nextId("att");
    if (this.http) {
      const resp = await firstValueFrom(
        this.http
          .post<{ id?: string }>(`${this.baseUrl}/api/attendances`, {
            ...data,
            nombre: data.alumno,
            id,
          })
          .pipe(timeout(8000)),
      );
      const createdId = resp?.id || id;
      const record: AttendanceRecord = { ...data, id: createdId };
      const updated = [record, ...this.attendancesSubject.value];
      saveLS("gym_attendances", updated);
      this.attendancesSubject.next(updated);
      return { id: createdId };
    }

    const record: AttendanceRecord = { ...data, id };
    const updated = [...this.attendancesSubject.value, record];
    saveLS("gym_attendances", updated);
    this.attendancesSubject.next(updated);
    return { id };
  }

  async updateBooking(
    id: string,
    data: BookingDraft & { nombre?: string | null },
  ): Promise<void> {
    if (this.http) {
      await firstValueFrom(
        this.http
          .put<unknown>(
            `${this.baseUrl}/api/bookings/${encodeURIComponent(id)}`,
            data,
          )
          .pipe(timeout(8000)),
      );
    }
    const updated = this.bookingsSubject.value.map((b) =>
      b.id === id ? { ...b, ...data } : b,
    );
    saveLS("gym_bookings", updated);
    this.bookingsSubject.next(updated);
  }

  async updateAttendance(id: string, data: AttendanceDraft): Promise<void> {
    if (this.http) {
      await firstValueFrom(
        this.http
          .put<unknown>(
            `${this.baseUrl}/api/attendances/${encodeURIComponent(id)}`,
            { ...data, nombre: data.alumno },
          )
          .pipe(timeout(8000)),
      );
    }
    const updated = this.attendancesSubject.value.map((a) =>
      a.id === id ? { ...a, ...data } : a,
    );
    saveLS("gym_attendances", updated);
    this.attendancesSubject.next(updated);
  }

  async deleteBooking(id: string): Promise<void> {
    if (this.http) {
      await firstValueFrom(
        this.http
          .delete<unknown>(
            `${this.baseUrl}/api/bookings/${encodeURIComponent(id)}`,
          )
          .pipe(timeout(8000)),
      );
    }
    const updated = this.bookingsSubject.value.filter((b) => b.id !== id);
    saveLS("gym_bookings", updated);
    this.bookingsSubject.next(updated);
  }

  async deleteAttendance(id: string): Promise<void> {
    if (this.http) {
      await firstValueFrom(
        this.http
          .delete<unknown>(
            `${this.baseUrl}/api/attendances/${encodeURIComponent(id)}`,
          )
          .pipe(timeout(8000)),
      );
    }
    const updated = this.attendancesSubject.value.filter((a) => a.id !== id);
    saveLS("gym_attendances", updated);
    this.attendancesSubject.next(updated);
  }

  private normalizeBookings(raw: unknown): BookingRecord[] {
    const list = Array.isArray(raw)
      ? raw
      : isRecord(raw) && Array.isArray(raw["bookings"])
        ? raw["bookings"]
        : isRecord(raw) && Array.isArray(raw["rows"])
          ? raw["rows"]
          : [];
    return list
      .filter(isRecord)
      .map((item) => ({
        id: isString(item["id"]) ? item["id"] : String(item["id"] ?? ""),
        entrenamiento: isString(item["entrenamiento"])
          ? item["entrenamiento"]
          : "",
        fecha: isString(item["fecha"]) ? item["fecha"] : "",
        turno: isString(item["turno"]) ? item["turno"] : "",
        usuario: isString(item["usuario"]) ? item["usuario"] : undefined,
        email: isString(item["email"]) ? item["email"] : null,
        telefono: isString(item["telefono"]) ? item["telefono"] : null,
        nombre: isString(item["nombre"]) ? item["nombre"] : null,
      }))
      .filter((item) => Boolean(item.id));
  }

  private normalizeAttendances(raw: unknown): AttendanceRecord[] {
    const list = Array.isArray(raw)
      ? raw
      : isRecord(raw) && Array.isArray(raw["attendances"])
        ? raw["attendances"]
        : isRecord(raw) && Array.isArray(raw["rows"])
          ? raw["rows"]
          : [];
    return list
      .filter(isRecord)
      .map((item) => ({
        id: isString(item["id"]) ? item["id"] : String(item["id"] ?? ""),
        clase: isString(item["clase"]) ? item["clase"] : "",
        fecha: isString(item["fecha"]) ? item["fecha"] : "",
        hora: isString(item["hora"]) ? item["hora"] : "",
        alumno: isString(item["alumno"])
          ? item["alumno"]
          : isString(item["nombre"])
            ? item["nombre"]
            : "",
      }))
      .filter((item) => Boolean(item.id));
  }

  private send(path: string, payload: object) {
    if (!this.http) {
      return Promise.resolve({});
    }
    return firstValueFrom(
      this.http
        .post<unknown>(this.baseUrl + path, payload)
        .pipe(timeout(20000)),
    );
  }

  async notifyBooking(
    user: NotificationIdentity,
    data: BookingDraft,
  ): Promise<NotificationReceipt> {
    if (user.email) {
      await this.send("/enviar-correo", {
        correo: user.email,
        nombre: user.displayName || "Usuario",
        ...data,
      });
      return "email";
    }
    return "no-contact";
  }

  async notifyAttendance(
    user: NotificationIdentity,
    data: AttendanceDraft,
    name: string | null,
  ): Promise<NotificationReceipt> {
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
    return "no-contact";
  }
}
