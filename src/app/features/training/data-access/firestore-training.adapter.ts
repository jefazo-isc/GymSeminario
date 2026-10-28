import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "@angular/fire/firestore";
import { firstValueFrom, map, timeout } from "rxjs";
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
@Injectable({ providedIn: "root" })
export class FirestoreTrainingAdapter implements TrainingRepository {
  private firestore = inject(Firestore);
  private http = inject(HttpClient);
  private endpoints = inject(APP_ENDPOINTS);
  bookings() {
    return collectionData(
      collection(this.firestore, "formularioEntrenamiento"),
      { idField: "id" },
    ).pipe(
      map((rows) =>
        rows.map((row) => {
          if (
            !isRecord(row) ||
            !["id", "entrenamiento", "fecha", "turno"].every((k) =>
              isString(row[k]),
            )
          )
            throw new Error("Registro de entrenamiento no válido.");
          return row as unknown as BookingRecord;
        }),
      ),
    );
  }
  attendances() {
    return collectionData(collection(this.firestore, "asistencias"), {
      idField: "id",
    }).pipe(
      map((rows) =>
        rows.map((row) => {
          if (
            !isRecord(row) ||
            !["id", "clase", "fecha", "hora", "alumno"].every((k) =>
              isString(row[k]),
            )
          )
            throw new Error("Registro de asistencia no válido.");
          return row as unknown as AttendanceRecord;
        }),
      ),
    );
  }
  createBooking(data: BookingCreate) {
    return addDoc(collection(this.firestore, "formularioEntrenamiento"), {
      ...data,
    });
  }
  createAttendance(data: AttendanceDraft) {
    return addDoc(collection(this.firestore, "asistencias"), { ...data });
  }
  updateBooking(id: string, data: BookingDraft & { nombre?: string | null }) {
    return updateDoc(doc(this.firestore, "formularioEntrenamiento", id), {
      ...data,
    });
  }
  updateAttendance(id: string, data: AttendanceDraft) {
    return updateDoc(doc(this.firestore, "asistencias", id), { ...data });
  }
  deleteBooking(id: string) {
    return deleteDoc(doc(this.firestore, "formularioEntrenamiento", id));
  }
  deleteAttendance(id: string) {
    return deleteDoc(doc(this.firestore, "asistencias", id));
  }
  private send(path: string, payload: object) {
    return firstValueFrom(
      this.http
        .post<unknown>(this.endpoints.notifications + path, payload)
        .pipe(timeout(20000)),
    );
  }
  async notifyBooking(
    user: NotificationIdentity,
    data: BookingDraft,
  ): Promise<NotificationReceipt> {
    if (user.email) {
      let nombre = user.displayName || "";
      if (!nombre) {
        const result = await getDocs(
          query(
            collection(this.firestore, "usuarios"),
            where("email", "==", user.email),
          ),
        );
        const stored = result.empty
          ? undefined
          : result.docs[0].data()["nombre"];
        nombre = typeof stored === "string" && stored ? stored : "Usuario";
      }
      await this.send("/enviar-correo", {
        correo: user.email,
        nombre,
        ...data,
      });
      return "email";
    }
    if (user.phoneNumber) {
      const mensaje =
        "Gracias por enviar tu formulario.\nEntrenamiento: " +
        data.entrenamiento +
        "\nFecha: " +
        data.fecha +
        "\nTurno: " +
        data.turno +
        "\n¡Nos vemos pronto!";
      await this.send("/enviar-sms", { telefono: user.phoneNumber, mensaje });
      return "sms";
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
    if (user.phoneNumber) {
      const mensaje =
        "Gracias por registrar tu asistencia.\nClase: " +
        data.clase +
        "\nFecha: " +
        data.fecha +
        "\nHora: " +
        data.hora;
      await this.send("/enviar-sms", { telefono: user.phoneNumber, mensaje });
      return "sms";
    }
    return "no-contact";
  }
}
