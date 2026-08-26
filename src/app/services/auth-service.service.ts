import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthServiceService {

  private usuarioActualSubject = new BehaviorSubject<string | null>(localStorage.getItem('usuarioActual'));

  usuarioActual$ = this.usuarioActualSubject.asObservable();

  constructor() { }

  login(usuario: string) {
    localStorage.setItem('usuarioActual', usuario);
    this.usuarioActualSubject.next(usuario);  
  }

  logout() {
    localStorage.removeItem('usuarioActual');
    this.usuarioActualSubject.next(null);  
  }
}
