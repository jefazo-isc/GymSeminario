import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PerfilSocio } from '../models/rutina.model';

const STORAGE_KEY = 'gym_perfil_socio';

@Injectable({
  providedIn: 'root'
})
export class PerfilSocioService {
  private perfilDefault: PerfilSocio = {
    nombre: 'Socio',
    edad: 24,
    peso: 75,
    altura: 175,
    genero: 'Masculino',
    objetivo: 'Ganancia muscular',
    diasDisponibles: 4,
    nivel: 'Intermedio',
    restriccionesMedicas: 'Ninguna'
  };

  private perfilSubject = new BehaviorSubject<PerfilSocio>(this.cargarPerfilInicial());
  public perfil$: Observable<PerfilSocio> = this.perfilSubject.asObservable();

  constructor() {}

  private cargarPerfilInicial(): PerfilSocio {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return { ...this.perfilDefault, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Error leyendo perfil de localStorage:', e);
    }
    return { ...this.perfilDefault };
  }

  getPerfilActual(): PerfilSocio {
    return this.perfilSubject.getValue();
  }

  guardarPerfil(nuevoPerfil: PerfilSocio): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevoPerfil));
    } catch (e) {
      console.warn('Error guardando en localStorage:', e);
    }
    this.perfilSubject.next({ ...nuevoPerfil });
  }

  actualizarNombre(nombre: string): void {
    const actual = this.getPerfilActual();
    if (!actual.nombre || actual.nombre === 'Socio') {
      actual.nombre = nombre;
      this.guardarPerfil(actual);
    }
  }
}
