import {
  isFiniteNumber,
  isRecord,
  isString,
} from "../../../core/storage/storage-guards";
import {
  AlertaVencimiento,
  SesionHistorial,
  WorkoutLogEntry,
} from "./sesion.model";

export const isSession = (v: unknown): v is SesionHistorial =>
  isRecord(v) &&
  ["id", "clase", "fecha"].every((k) => isString(v[k])) &&
  ["Mañana", "Tarde", "Noche"].includes(String(v["turno"])) &&
  ["Reservada", "Asistida", "Cancelada", "Ausente"].includes(
    String(v["estado"]),
  );

export const isAlert = (v: unknown): v is AlertaVencimiento =>
  isRecord(v) &&
  ["id", "titulo", "mensaje", "fecha"].every((k) => isString(v[k])) &&
  ["membresia", "sesion", "pago"].includes(String(v["tipo"])) &&
  ["alta", "media", "baja"].includes(String(v["prioridad"])) &&
  isFiniteNumber(v["diasRestantes"]) &&
  typeof v["leida"] === "boolean";

export const isWorkoutLog = (v: unknown): v is WorkoutLogEntry =>
  isRecord(v) &&
  ["id", "ejercicio", "grupoMuscular", "fecha"].every((k) => isString(v[k])) &&
  isFiniteNumber(v["series"]) &&
  isFiniteNumber(v["repeticiones"]) &&
  isFiniteNumber(v["pesoKg"]);
