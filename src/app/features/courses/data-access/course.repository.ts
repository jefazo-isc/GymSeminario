import { Observable } from "rxjs";
import { InjectionToken, inject } from "@angular/core";
import { Curso } from "../models/course.model";
import { CursoService } from "./curso.service";
export interface CourseRepository {
  loadCatalog(): Observable<Curso[]>;
}
export const COURSES = new InjectionToken<CourseRepository>(
  "CourseRepository",
  { providedIn: "root", factory: () => inject(CursoService) },
);
