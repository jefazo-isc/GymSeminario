import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';
import { PerfilSocioService } from '../../services/perfil-socio.service';
import { PerfilSocio } from '../../models/rutina.model';

@Component({
  selector: 'app-micuenta',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './micuenta.component.html',
  styleUrl: './micuenta.component.css'
})
export class MicuentaComponent implements OnInit {
  nombre: string | null = null;
  email: string | null = null;
  role: string | null = null;

  perfil: PerfilSocio = {
    nombre: '',
    edad: 24,
    peso: 75,
    altura: 175,
    genero: 'Masculino',
    objetivo: 'Ganancia muscular',
    diasDisponibles: 4,
    nivel: 'Intermedio',
    restriccionesMedicas: 'Ninguna'
  };

  guardadoExitoso = false;

  objetivos = [
    'Ganancia muscular',
    'Pérdida de grasa / Definición',
    'Fuerza máxima',
    'Acondicionamiento físico',
    'Tonificación general'
  ];

  niveles = ['Principiante', 'Intermedio', 'Avanzado'];
  opcionesDias = [2, 3, 4, 5, 6];
  generos = ['Masculino', 'Femenino', 'Otro'];

  constructor(
    private authService: AuthService,
    private perfilService: PerfilSocioService
  ) {}

  ngOnInit(): void {
    // Cargar datos de autenticación
    this.authService.userName$.subscribe((nombref) => {
      this.nombre = nombref;
      if (nombref && (!this.perfil.nombre || this.perfil.nombre === 'Socio')) {
        this.perfil.nombre = nombref;
      }
    });

    this.authService.userRole$.subscribe((rol) => {
      this.role = rol;
    });

    this.authService.getCurrentUser().then((user) => {
      if (user) {
        this.email = user.email || null;
        if (!this.nombre) {
          this.nombre = user.displayName || user.email?.split('@')[0] || 'Socio';
          this.perfil.nombre = this.nombre;
        }
      }
    });

    // Cargar perfil biométrico guardado
    this.perfil = { ...this.perfilService.getPerfilActual() };
  }

  get imc(): number {
    if (!this.perfil.peso || !this.perfil.altura) return 0;
    const metros = this.perfil.altura / 100;
    return parseFloat((this.perfil.peso / (metros * metros)).toFixed(1));
  }

  get estadoImc(): string {
    const val = this.imc;
    if (val === 0) return 'Sin calcular';
    if (val < 18.5) return 'Bajo peso';
    if (val < 25) return 'Peso normal';
    if (val < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  guardarDatos(): void {
    if (!this.perfil.nombre.trim() && this.nombre) {
      this.perfil.nombre = this.nombre;
    }
    this.perfilService.guardarPerfil(this.perfil);
    this.guardadoExitoso = true;
    setTimeout(() => {
      this.guardadoExitoso = false;
    }, 3500);
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }
}
