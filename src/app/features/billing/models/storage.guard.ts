import {
  isFiniteNumber,
  isRecord,
  isString,
} from "../../../core/storage/storage-guards";
import { Pago } from "./pago.model";
export const isPayment = (v: unknown): v is Pago =>
  isRecord(v) &&
  ["id", "folio", "concepto", "fecha", "metodo"].every((k) => isString(v[k])) &&
  isFiniteNumber(v["monto"]) &&
  ["Pagado", "Pendiente", "Cancelado"].includes(String(v["estado"])) &&
  (v["descripcion"] === undefined || isString(v["descripcion"])) &&
  (v["periodo"] === undefined || isString(v["periodo"]));
