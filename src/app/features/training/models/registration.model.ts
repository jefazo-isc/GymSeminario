export interface BookingDraft {
  entrenamiento: string;
  fecha: string;
  turno: string;
}
export interface BookingCreate extends BookingDraft {
  usuario: string;
  email: string | null;
  telefono: string | null;
  nombre: string | null;
}
export interface BookingRecord extends BookingDraft {
  id: string;
  usuario?: string;
  email?: string | null;
  telefono?: string | null;
  nombre?: string | null;
}
export interface AttendanceDraft {
  clase: string;
  fecha: string;
  hora: string;
  alumno: string;
}
export interface AttendanceRecord extends AttendanceDraft {
  id: string;
}
export interface NotificationIdentity {
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
}
export type NotificationReceipt = "email" | "sms" | "no-contact";
