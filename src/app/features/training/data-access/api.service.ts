import { inject } from "@angular/core";
import { APP_ENDPOINTS } from "../../../core/config/app-endpoints";
// src/app/services/api.service.ts

import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class ApiService {
  private baseUrl = inject(APP_ENDPOINTS).notifications;

  constructor(private http: HttpClient) {}

  enviarCorreo(data: {
    correo: string;
    nombre: string;
    entrenamiento: string;
    fecha: string;
    turno: string;
  }): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/enviar-correo`, data);
  }

  enviarAsistencia(data: {
    correo: string;
    nombre: string;
    clase: string;
    fecha: string;
    hora: string;
  }): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/enviar-asistencia`, data);
  }

  enviarSms(data: { telefono: string; mensaje: string }): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/enviar-sms`, data);
  }
}
