import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  // Creamos un BehaviorSubject para mantener el estado del usuario.
  // El valor inicial es null porque el usuario no está logueado por defecto.
  private usuarioSubject = new BehaviorSubject<string | null>(null);

  // Exponemos el observable de usuario para que otros componentes puedan suscribirse.
  usuario$ = this.usuarioSubject.asObservable();

  constructor() { }

  // Método para guardar el nombre del usuario
  setUsuario(usuario: string): void {
    this.usuarioSubject.next(usuario);
  }

  // Método para limpiar el nombre del usuario (cerrar sesión)
  clearUsuario(): void {
    this.usuarioSubject.next(null);
  }
}
