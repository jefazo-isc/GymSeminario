import {
  isFiniteNumber,
  isRecord,
  isString,
} from "../../../core/storage/storage-guards";
import { PerfilSocio } from "./profile.model";
export const isProfile = (v: unknown): v is PerfilSocio =>
  isRecord(v) &&
  ["nombre", "genero", "objetivo", "nivel", "restriccionesMedicas"].every((k) =>
    isString(v[k]),
  ) &&
  ["edad", "peso", "altura", "diasDisponibles"].every((k) =>
    isFiniteNumber(v[k]),
  );
export const isProfilePatch = (v: unknown): v is Partial<PerfilSocio> =>
  isRecord(v) &&
  ["nombre", "genero", "objetivo", "nivel", "restriccionesMedicas"].every(
    (k) => v[k] === undefined || isString(v[k]),
  ) &&
  ["edad", "peso", "altura", "diasDisponibles"].every(
    (k) => v[k] === undefined || isFiniteNumber(v[k]),
  );
