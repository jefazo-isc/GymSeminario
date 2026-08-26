import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EjercicioService {
  private apiUrl = 'https://gym-proyecto.free.beeceptor.com/todos';

  constructor(private http: HttpClient) {}

  getEjercicios(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}
