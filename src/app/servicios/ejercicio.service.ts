import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { APP_ENDPOINTS } from "../core/config/app-endpoints";

@Injectable({
  providedIn: "root",
})
export class EjercicioService {
  private apiUrl = inject(APP_ENDPOINTS).legacyExercises;

  constructor(private http: HttpClient) {}

  getEjercicios(): Observable<unknown> {
    return this.http.get<unknown>(this.apiUrl);
  }
}
