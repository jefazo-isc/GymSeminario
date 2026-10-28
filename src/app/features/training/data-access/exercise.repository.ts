import { InjectionToken, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ExerciseCatalog } from "../models/exercise.model";
import { EjercicioService } from "./ejercicio.service";
export interface ExerciseRepository {
  getEjercicios(): Observable<ExerciseCatalog>;
}
export const EXERCISES = new InjectionToken<ExerciseRepository>(
  "ExerciseRepository",
  { providedIn: "root", factory: () => inject(EjercicioService) },
);
