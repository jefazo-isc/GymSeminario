import {
  isFiniteNumber,
  isRecord,
  isString,
  isStringList,
} from "../../../core/storage/storage-guards";
import { Membresia } from "./membresia.model";
export const isMembership = (v: unknown): v is Membresia =>
  isRecord(v) &&
  isString(v["id"]) &&
  ["Básico", "Pro Fitness", "Black Elite"].includes(String(v["nombrePlan"])) &&
  isFiniteNumber(v["precio"]) &&
  ["Mensual", "Trimestral", "Anual"].includes(String(v["periodo"])) &&
  isString(v["fechaInicio"]) &&
  isString(v["fechaFin"]) &&
  Number.isFinite(Date.parse(v["fechaFin"])) &&
  isStringList(v["beneficios"]);
