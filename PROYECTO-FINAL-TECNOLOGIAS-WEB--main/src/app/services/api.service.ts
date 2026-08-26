// src/app/services/api.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'https://node-proyecto-sz83.onrender.com';

  constructor(private http: HttpClient) {}

  enviarCorreo(data: {
    correo: string;
    nombre: string;
    entrenamiento: string;
    fecha: string;
    turno: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/enviar-correo`, data);
  }

  enviarAsistencia(data: {
    correo: string;
    nombre: string;
    clase: string;
    fecha: string;
    hora: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/enviar-asistencia`, data);
  }

  enviarSms(data: {
    telefono: string;
    mensaje: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/enviar-sms`, data);
  }
}
