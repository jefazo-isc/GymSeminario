import { InjectionToken, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  AttendanceDraft,
  AttendanceRecord,
  BookingCreate,
  BookingDraft,
  BookingRecord,
  NotificationIdentity,
  NotificationReceipt,
} from "../models/registration.model";
import { FirestoreTrainingAdapter } from "./firestore-training.adapter";
export interface TrainingRepository {
  bookings(): Observable<BookingRecord[]>;
  attendances(): Observable<AttendanceRecord[]>;
  createBooking(data: BookingCreate): Promise<{ id: string }>;
  createAttendance(data: AttendanceDraft): Promise<{ id: string }>;
  updateBooking(
    id: string,
    data: BookingDraft & { nombre?: string | null },
  ): Promise<void>;
  updateAttendance(id: string, data: AttendanceDraft): Promise<void>;
  deleteBooking(id: string): Promise<void>;
  deleteAttendance(id: string): Promise<void>;
  notifyBooking(
    user: NotificationIdentity,
    data: BookingDraft,
  ): Promise<NotificationReceipt>;
  notifyAttendance(
    user: NotificationIdentity,
    data: AttendanceDraft,
    name: string | null,
  ): Promise<NotificationReceipt>;
}
export const TRAINING = new InjectionToken<TrainingRepository>(
  "TrainingRepository",
  { providedIn: "root", factory: () => inject(FirestoreTrainingAdapter) },
);
