import {
  isRecord,
  isString,
  isFiniteNumber,
} from "../../../core/storage/storage-guards";
import { StoredUser } from "./user.model";

/** Select the fields used by the UI from the untrusted Firestore document. */
export function readStoredUser(value: unknown): StoredUser {
  if (!isRecord(value)) return {};
  const user: StoredUser = {};
  for (const key of ["uid", "email", "nombre", "telefono", "role"] as const) {
    if (isString(value[key])) user[key] = value[key];
  }
  if (isFiniteNumber(value["intentos"]) && value["intentos"] >= 0)
    user.intentos = value["intentos"];
  return user;
}
