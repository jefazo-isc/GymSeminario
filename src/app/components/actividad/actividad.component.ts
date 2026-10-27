import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SesionService } from '../../services/sesion.service';
import { SesionHistorial, OcupacionHorario, AlertaVencimiento } from '../../models/sesion.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-actividad',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './actividad.component.html',
  styleUrl: './actividad.component.css'
})
export class ActividadComponent implements OnInit {

  vistaActiva: 'historial' | 'ocupacion' | 'alertas' = 'historial';
  historial: SesionHistorial[] = [];
  ocupacion: OcupacionHorario[] = [];
  alertas: AlertaVencimiento[] = [];
  alertasSinLeer = 0;

  filtroEstado: string = 'todos';
  filtroTurno: string = 'todos';

  constructor(private sesionService: SesionService) {}

  ngOnInit(): void {
    this.sesionService.historial$.subscribe(h => { this.historial = h; });
    this.sesionService.alertas$.subscribe(a => {
      this.alertas = a;
      this.alertasSinLeer = this.sesionService.getAlertasSinLeer();
    });
    this.ocupacion = this.sesionService.getOcupacionHorarios();
  }

  // ── Historial ─────────────────────────────────────────────────────────
  get historialFiltrado(): SesionHistorial[] {
    return this.historial.filter(s => {
      const okEstado = this.filtroEstado === 'todos' || s.estado.toLowerCase() === this.filtroEstado;
      return okEstado;
    });
  }

  get proximasSesiones(): SesionHistorial[] {
    return this.historial.filter(s => s.estado === 'Reservada');
  }

  get sesionesAsistidas(): number {
    return this.historial.filter(s => s.estado === 'Asistida').length;
  }

  get porcentajeAsistencia(): number {
    const pasadas = this.historial.filter(s => s.estado !== 'Reservada').length;
    if (!pasadas) return 0;
    return Math.round((this.sesionesAsistidas / pasadas) * 100);
  }

  cancelar(sesion: SesionHistorial): void {
    Swal.fire({
      title: '¿Cancelar esta sesión?',
      html: `<p><strong>${sesion.clase}</strong> — ${sesion.fecha} (${sesion.turno})</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver'
    }).then(r => {
      if (r.isConfirmed) {
        this.sesionService.cancelarSesion(sesion.id);
        Swal.fire({ icon: 'info', title: 'Sesión cancelada', confirmButtonColor: '#ff5722' });
      }
    });
  }

  // ── Ocupación ─────────────────────────────────────────────────────────
  get turnosDisponibles(): string[] { return ['Mañana', 'Tarde', 'Noche']; }

  get ocupacionFiltrada(): OcupacionHorario[] {
    if (this.filtroTurno === 'todos') return this.ocupacion;
    return this.ocupacion.filter(o => o.turno === this.filtroTurno);
  }

  getPct(o: OcupacionHorario): number { return this.sesionService.getPorcentajeOcupacion(o); }
  getNivel(o: OcupacionHorario): string { return this.sesionService.getNivelOcupacion(this.getPct(o)); }

  get horarioPico(): OcupacionHorario | null {
    if (!this.ocupacion.length) return null;
    return this.ocupacion.reduce((a, b) => this.getPct(a) >= this.getPct(b) ? a : b);
  }

  get horarioLibre(): OcupacionHorario | null {
    if (!this.ocupacion.length) return null;
    return this.ocupacion.reduce((a, b) => this.getPct(a) <= this.getPct(b) ? a : b);
  }

  // ── Alertas ───────────────────────────────────────────────────────────
  get alertasOrdenadas(): AlertaVencimiento[] {
    const orden: Record<string, number> = { alta: 0, media: 1, baja: 2 };
    return [...this.alertas].sort((a, b) => {
      if (a.leida !== b.leida) return a.leida ? 1 : -1;
      return (orden[a.prioridad] ?? 2) - (orden[b.prioridad] ?? 2);
    });
  }

  marcarLeida(alerta: AlertaVencimiento): void {
    this.sesionService.marcarLeidaAlerta(alerta.id);
  }

  marcarTodasLeidas(): void {
    this.sesionService.marcarTodasLeidas();
  }

  iconoAlerta(tipo: string): string {
    const m: Record<string, string> = { membresia: 'bx-id-card', pago: 'bx-credit-card', sesion: 'bx-calendar-event' };
    return m[tipo] ?? 'bx-bell';
  }

  badgeAlerta(prioridad: string): string {
    const m: Record<string, string> = { alta: 'bg-danger', media: 'bg-warning text-dark', baja: 'bg-secondary' };
    return m[prioridad] ?? 'bg-secondary';
  }

  iconoSesion(clase: string): string {
    const m: Record<string, string> = {
      'Spinning': 'bx-cycling', 'Yoga': 'bx-body', 'Crossfit': 'bx-dumbbell',
      'Pesas': 'bx-dumbbell', 'Boxeo': 'bx-target-lock'
    };
    return m[clase] ?? 'bx-run';
  }
}
