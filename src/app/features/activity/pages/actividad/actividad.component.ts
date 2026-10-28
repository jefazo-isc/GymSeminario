import { CommonModule } from "@angular/common";
import { Component, DestroyRef, OnInit, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import Swal from "sweetalert2";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { ACTIVITY } from "../../data-access/activity.repository";
import { combineLatest, Subscription } from "rxjs";
import { RequestState } from "../../../../core/data-access/request-state";
import { RequestStateComponent } from "../../../../shared/ui/request-state/request-state.component";
import {
  AlertaVencimiento,
  OcupacionHorario,
  SesionHistorial,
} from "../../models/sesion.model";

@Component({
  selector: "app-actividad",
  standalone: true,
  imports: [
    CommonModule,
    RequestStateComponent,
    RouterModule,
    FormsModule,
    ButtonDirective,
    IconComponent,
  ],
  templateUrl: "./actividad.component.html",
  styleUrl: "./actividad.component.css",
})
export class ActividadComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  vistaActiva: "historial" | "ocupacion" | "alertas" = "historial";
  historial: SesionHistorial[] = [];
  ocupacion: OcupacionHorario[] = [];
  alertas: AlertaVencimiento[] = [];
  alertasSinLeer = 0;
  feedback = "";
  busy = false;
  loading = false;
  error = "";
  private stream?: Subscription;

  filtroEstado: string = "todos";
  filtroTurno: string = "todos";

  private readonly sesionService = inject(ACTIVITY);

  ngOnInit(): void {
    this.load();
    this.destroyRef.onDestroy(() => this.stream?.unsubscribe());
  }
  get viewState(): RequestState<unknown> {
    if (this.loading) return { status: "loading" };
    if (this.error)
      return {
        status: "error",
        error: { kind: "network", message: this.error, retryable: true },
      };
    return { status: "data", data: this.historial };
  }
  load() {
    this.stream?.unsubscribe();
    this.loading = true;
    this.error = "";
    this.stream = combineLatest({
      history: this.sesionService.historial$,
      alerts: this.sesionService.alertas$,
      occupancy: this.sesionService.ocupacion$,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.historial = data.history;
          this.alertas = data.alerts;
          this.ocupacion = data.occupancy;
          this.alertasSinLeer = this.alertas.filter((a) => !a.leida).length;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.error =
            "No se pudo consultar la actividad. Puedes reintentar la lectura sin reenviar cambios.";
        },
      });
  }

  // ── Historial ─────────────────────────────────────────────────────────
  get historialFiltrado(): SesionHistorial[] {
    return this.historial.filter((s) => {
      const okEstado =
        this.filtroEstado === "todos" ||
        s.estado.toLowerCase() === this.filtroEstado;
      return okEstado;
    });
  }

  get proximasSesiones(): SesionHistorial[] {
    return this.historial.filter((s) => s.estado === "Reservada");
  }

  get sesionesAsistidas(): number {
    return this.historial.filter((s) => s.estado === "Asistida").length;
  }

  get porcentajeAsistencia(): number {
    const pasadas = this.historial.filter(
      (s) => s.estado !== "Reservada",
    ).length;
    if (!pasadas) return 0;
    return Math.round((this.sesionesAsistidas / pasadas) * 100);
  }

  cancelar(sesion: SesionHistorial): void {
    if (this.busy) return;
    Swal.fire({
      title: "¿Cancelar esta sesión?",
      text:
        "Se cancelará solo el ejemplo de " +
        sesion.clase +
        " del " +
        sesion.fecha +
        ". No se modifica ninguna reserva de Firestore.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "var(--color-action)",
      cancelButtonColor: "var(--color-surface-secondary)",
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "Volver",
    }).then(async (r) => {
      if (r.isConfirmed) {
        this.busy = true;
        try {
          await this.sesionService.cancelarSesion(sesion.id);
        } catch {
          this.feedback =
            "No se pudo guardar la cancelación local. El ejemplo conserva su estado anterior.";
          return;
        } finally {
          this.busy = false;
        }
        Swal.fire({
          icon: "info",
          title: "Ejemplo cancelado en este navegador",
          confirmButtonColor: "var(--color-action)",
        });
      }
    });
  }

  // ── Ocupación ─────────────────────────────────────────────────────────
  get turnosDisponibles(): string[] {
    return ["Mañana", "Tarde", "Noche"];
  }

  get ocupacionFiltrada(): OcupacionHorario[] {
    if (this.filtroTurno === "todos") return this.ocupacion;
    return this.ocupacion.filter((o) => o.turno === this.filtroTurno);
  }

  getPct(o: OcupacionHorario): number {
    return this.sesionService.getPorcentajeOcupacion(o);
  }
  getNivel(o: OcupacionHorario): string {
    return this.sesionService.getNivelOcupacion(this.getPct(o));
  }

  get horarioPico(): OcupacionHorario | null {
    if (!this.ocupacion.length) return null;
    return this.ocupacion.reduce((a, b) =>
      this.getPct(a) >= this.getPct(b) ? a : b,
    );
  }

  get horarioLibre(): OcupacionHorario | null {
    if (!this.ocupacion.length) return null;
    return this.ocupacion.reduce((a, b) =>
      this.getPct(a) <= this.getPct(b) ? a : b,
    );
  }

  // ── Alertas ───────────────────────────────────────────────────────────
  get alertasOrdenadas(): AlertaVencimiento[] {
    const orden: Record<string, number> = { alta: 0, media: 1, baja: 2 };
    return [...this.alertas].sort((a, b) => {
      if (a.leida !== b.leida) return a.leida ? 1 : -1;
      return (orden[a.prioridad] ?? 2) - (orden[b.prioridad] ?? 2);
    });
  }

  async marcarLeida(alerta: AlertaVencimiento): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.sesionService.marcarLeidaAlerta(alerta.id);
      this.feedback = "Aviso marcado como leído en este navegador.";
    } catch {
      this.feedback =
        "No se pudo guardar el cambio local. Conservamos el aviso sin modificar.";
    } finally {
      this.busy = false;
    }
  }

  async marcarTodasLeidas(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.sesionService.marcarTodasLeidas();
      this.feedback = "Avisos marcados como leídos en este navegador.";
    } catch {
      this.feedback =
        "No se pudieron guardar los cambios locales. Conservamos los avisos.";
    } finally {
      this.busy = false;
    }
  }

  badgeAlerta(prioridad: string): string {
    const m: Record<string, string> = {
      alta: "status--danger",
      media: "status--warning",
      baja: "status--accent",
    };
    return m[prioridad] ?? "bg-secondary";
  }
}
