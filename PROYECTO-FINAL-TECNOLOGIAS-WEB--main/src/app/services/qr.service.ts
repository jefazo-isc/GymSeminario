import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class QrService {
  private apiUrl = 'https://api-j6b4.onrender.com/api/user-qr';  // endpoint correcto

  constructor(private http: HttpClient) {}

  getQrData(uid: string) {
    console.log('Llamando API para UID:', uid);
    return this.http.get<{ data: string }>(`${this.apiUrl}/${uid}`).pipe(
      tap(data => console.log('Datos recibidos del API:', data)),
      catchError(err => {
        console.error('Error en llamada al API:', err);
        return of({ data: 'jeje' }); // Devuelve un valor por defecto para no romper el stream
      })
    );
  }
}
