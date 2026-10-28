import {
  isFiniteNumber,
  isRecord,
  isString,
} from "../../../core/storage/storage-guards";
import { AlertaVencimiento, SesionHistorial } from "./sesion.model";
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
