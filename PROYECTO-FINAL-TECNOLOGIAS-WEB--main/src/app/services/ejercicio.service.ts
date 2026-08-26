import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EjercicioService {
  private apiUrl = 'https://arl150.github.io/ejercicios-api/ejercicios.json';

  constructor(private http: HttpClient) {}

  getEjercicios(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}
