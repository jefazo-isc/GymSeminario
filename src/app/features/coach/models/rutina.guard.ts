import {
  isFiniteNumber,
  isRecord,
  isString,
} from "../../../core/storage/storage-guards";
import { CoachInfo, RespuestaChat, RutinaData } from "./rutina.model";
export const validRoutine = (v: unknown): v is RutinaData =>
  isRecord(v) &&
  [
    "tituloRutina",
    "objetivo",
    "nivelRecomendado",
    "recomendacionesGenerales",
  ].every((k) => isString(v[k])) &&
  Array.isArray(v["diasSemana"]) &&
  v["diasSemana"].length > 0 &&
  v["diasSemana"].every(
    (d) =>
      isRecord(d) &&
      isString(d["dia"]) &&
      isString(d["grupoMuscular"]) &&
      Array.isArray(d["ejercicios"]) &&
      d["ejercicios"].length > 0 &&
      d["ejercicios"].every(
        (e) =>
          isRecord(e) &&
          isString(e["nombre"]) &&
          isFiniteNumber(e["series"]) &&
          e["series"] > 0 &&
          isString(e["repeticiones"]) &&
          isFiniteNumber(e["descansoSegundos"]) &&
          e["descansoSegundos"] >= 0 &&
          (e["notasCoach"] === undefined || isString(e["notasCoach"])),
      ),
  );
export const isCoach = (v: unknown): v is CoachInfo =>
  isRecord(v) &&
  ["id", "nombre", "titulo", "emoji", "frase"].every((k) => isString(v[k]));
export const isChatResponse = (v: unknown): v is RespuestaChat =>
  isRecord(v) &&
  typeof v["exito"] === "boolean" &&
  isString(v["coach"]) &&
  isString(v["respuesta"]);
