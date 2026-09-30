import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PerfilSocio, RespuestaRutina, CoachInfo, RespuestaChat, MensajeChat } from '../models/rutina.model';

@Injectable({
  providedIn: 'root'
})
export class RutinaService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Envía el perfil del socio a la IA de Gemini para generar su rutina personalizada
   */
  generarRutina(perfil: PerfilSocio): Observable<RespuestaRutina> {
    return this.http.post<RespuestaRutina>(`${this.apiUrl}/rutina`, perfil);
  }

  /**
   * Obtiene la lista de coaches disponibles
   */
  obtenerCoaches(): Observable<CoachInfo[]> {
    return this.http.get<CoachInfo[]>(`${this.apiUrl}/coaches`);
  }

  /**
   * Envía mensaje al coach seleccionado con contexto y perfil biométrico
   */
  enviarMensajeChat(coachId: string, mensaje: string, historial: MensajeChat[], contextoRutina?: any, perfilUsuario?: PerfilSocio): Observable<RespuestaChat> {
    return this.http.post<RespuestaChat>(`${this.apiUrl}/coach/chat`, {
      coachId,
      mensaje,
      historial,
      contextoRutina,
      perfilUsuario
    });
  }
}

