import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RutinaService } from '../../services/rutina.service';
import { AuthService } from '../../auth/data-access/auth.service';
import { PerfilSocioService } from '../../services/perfil-socio.service';
import { PerfilSocio, RutinaData, CoachInfo, MensajeChat } from '../../models/rutina.model';

@Component({
  selector: 'app-coach-ia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './coach-ia.component.html',
  styleUrls: ['./coach-ia.component.css']
})
export class CoachIaComponent implements OnInit {
  pestanaActiva: 'rutina' | 'chat' = 'rutina';

  // Autenticación de Google anti-bots
  usuarioAutenticado = false;
  usuarioNombre: string | null = null;
  cargandoAuth = true;

  // Perfil del Socio (centralizado desde PerfilSocioService)
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

  cargando = false;
  rutina: RutinaData | null = null;
  errorMensaje: string | null = null;
  origenRespuesta: string | null = null;

  objetivos = [
    'Ganancia muscular',
    'Pérdida de grasa / Definición',
    'Fuerza máxima',
    'Acondicionamiento físico',
    'Tonificación general'
  ];

  opcionesDias = [2, 3, 4, 5, 6];

  // Estado Chat con Coaches
  coaches: CoachInfo[] = [];
  coachActivo: CoachInfo | null = null;
  mensajes: MensajeChat[] = [];
  mensajeInput = '';
  enviandoMensaje = false;

  constructor(
    private rutinaService: RutinaService,
    private authService: AuthService,
    private perfilService: PerfilSocioService
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
    this.cargarCoaches();

    // Sincronizar con el perfil biométrico guardado en Mi Cuenta
    this.perfilService.perfil$.subscribe((p) => {
      this.perfil = { ...p };
    });
  }

  verificarAutenticacion(): void {
    this.authService.getCurrentUser().then((user) => {
      this.cargandoAuth = false;
      if (user) {
        this.usuarioAutenticado = true;
        this.usuarioNombre = user.displayName || user.email;
        const nombre = user.displayName || user.email?.split('@')[0] || 'Socio';
        this.perfilService.actualizarNombre(nombre);
      } else {
        this.usuarioAutenticado = false;
      }
    }).catch(() => {
      this.cargandoAuth = false;
      this.usuarioAutenticado = false;
    });

    this.authService.userName$.subscribe((nombre) => {
      if (nombre) {
        this.usuarioAutenticado = true;
        this.usuarioNombre = nombre;
        this.perfilService.actualizarNombre(nombre);
      }
    });
  }

  async loginConGoogle(): Promise<void> {
    try {
      this.errorMensaje = null;
      await this.authService.signInWithGoogle();
      this.usuarioAutenticado = true;
    } catch (err: any) {
      console.error('Error al iniciar sesión con Google:', err);
      this.errorMensaje = 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.';
    }
  }

  cargarCoaches(): void {
    this.rutinaService.obtenerCoaches().subscribe({
      next: (lista) => {
        this.coaches = lista;
        if (lista.length > 0 && !this.coachActivo) {
          this.seleccionarCoach(lista[0]);
        }
      },
      error: (err) => console.error('Error cargando coaches:', err)
    });
  }

  seleccionarCoach(coach: CoachInfo): void {
    this.coachActivo = coach;
    this.mensajes = [
      {
        remitente: 'coach',
        texto: `${coach.frase} Hola ${this.perfil.nombre || 'compa'}, veo que andas en ${this.perfil.peso} kg buscando ${this.perfil.objetivo.toLowerCase()}. ¿Qué duda tienes sobre tus ejercicios o comida?`,
        hora: this.obtenerHora()
      }
    ];
  }

  enviarMensaje(): void {
    if (!this.mensajeInput.trim() || !this.coachActivo || this.enviandoMensaje) return;

    const texto = this.mensajeInput.trim();
    this.mensajeInput = '';

    this.mensajes.push({
      remitente: 'usuario',
      texto,
      hora: this.obtenerHora()
    });

    this.enviandoMensaje = true;

    this.rutinaService.enviarMensajeChat(
      this.coachActivo.id,
      texto,
      this.mensajes,
      this.rutina,
      this.perfil
    ).subscribe({
      next: (resp) => {
        this.enviandoMensaje = false;
        this.mensajes.push({
          remitente: 'coach',
          texto: resp.respuesta,
          hora: this.obtenerHora()
        });
      },
      error: (err) => {
        this.enviandoMensaje = false;
        this.mensajes.push({
          remitente: 'coach',
          texto: `¡Ocurrió un error al contactar a ${this.coachActivo?.nombre}! Intenta nuevamente.`,
          hora: this.obtenerHora()
        });
      }
    });
  }

  generarRutina(): void {
    if (!this.perfil.nombre.trim()) {
      this.perfil.nombre = 'Socio';
    }

    this.cargando = true;
    this.errorMensaje = null;
    this.rutina = null;

    this.rutinaService.generarRutina(this.perfil).subscribe({
      next: (resp) => {
        this.cargando = false;
        if (resp && resp.data) {
          this.rutina = resp.data;
          this.origenRespuesta = resp.origen || 'gemini';
        } else {
          this.errorMensaje = resp.error || 'No se pudo generar la rutina.';
        }
      },
      error: (err) => {
        this.cargando = false;
        console.error('Error generando rutina:', err);
        this.errorMensaje = 'No se pudo conectar con el servidor. Verifica que esté activo en el puerto 3000.';
      }
    });
  }

  imprimirRutina(): void {
    window.print();
  }

  nuevaRutina(): void {
    this.rutina = null;
    this.errorMensaje = null;
  }

  private obtenerHora(): string {
    const ahora = new Date();
    return ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
