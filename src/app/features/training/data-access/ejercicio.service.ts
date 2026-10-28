import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { map, timeout } from "rxjs";
import { APP_ENDPOINTS } from "../../../core/config/app-endpoints";
import {
  isFiniteNumber,
  isRecord,
  isString,
} from "../../../core/storage/storage-guards";
import { ExerciseCatalog } from "../models/exercise.model";
export const isExerciseCatalog = (v: unknown): v is ExerciseCatalog =>
  isRecord(v) &&
  Array.isArray(v["datosPorParte"]) &&
  v["datosPorParte"].every(
    (g) =>
      isRecord(g) &&
      isString(g["parte"]) &&
      Array.isArray(g["ejercicios"]) &&
      g["ejercicios"].every(
        (e) =>
          isRecord(e) &&
          isString(e["nombre"]) &&
          isString(e["equipo"]) &&
          (isString(e["series"]) || isFiniteNumber(e["series"])) &&
          (isString(e["repeticiones"]) || isFiniteNumber(e["repeticiones"])),
      ),
  );
@Injectable({ providedIn: "root" })
export class EjercicioService {
  private http = inject(HttpClient);
  private endpoints = inject(APP_ENDPOINTS);
  getEjercicios() {
    return this.http.get<unknown>(this.endpoints.exercises).pipe(
      timeout(15000),
      map((v) => {
        if (!isExerciseCatalog(v))
          throw new Error("Catálogo de ejercicios no válido.");
        return v;
      }),
    );
  }
}
