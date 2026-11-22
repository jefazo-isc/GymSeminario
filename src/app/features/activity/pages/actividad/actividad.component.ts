import { CommonModule } from "@angular/common";
import { Component, DestroyRef, OnInit, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subscription, combineLatest, of } from "rxjs";
import Swal from "sweetalert2";
import { RequestState } from "../../../../core/data-access/request-state";
import { localDate } from "../../../../core/date/local-date";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { RequestStateComponent } from "../../../../shared/ui/request-state/request-state.component";
import { ACTIVITY } from "../../data-access/activity.repository";
import {
  AlertaVencimiento,
  OcupacionHorario,
  SesionHistorial,
  WorkoutLogDraft,
  WorkoutLogEntry,
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
  private readonly sesionService = inject(ACTIVITY);

  vistaActiva: "historial" | "ocupacion" | "alertas" | "bitacora" =
    "historial";
  historial: SesionHistorial[] = [];
  ocupacion: OcupacionHorario[] = [];
  alertas: AlertaVencimiento[] = [];
  workoutLogs: WorkoutLogEntry[] = [];
  alertasSinLeer = 0;
  feedback = "";
  busy = false;
  loading = false;
  error = "";
  private stream?: Subscription;

  filtroEstado = "todos";
  filtroTurno = "todos";

  readonly gruposMusculares = [
    "Pecho",
    "Espalda",
    "Pierna",
    "Hombro",
    "Brazo",
    "Core",
    "Full Body",
  ];
  logDraft: WorkoutLogDraft = {
    ejercicio: "",
    grupoMuscular: "Pecho",
    series: 4,
    repeticiones: 10,
    pesoKg: 40,
    rpe: 8,
    fecha: localDate(),
    notas: "",
  };

  ngOnInit(): void {
    this.load();
    void this.sesionService.syncFromServer?.().catch(() => undefined);
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

  load(): void {
    this.stream?.unsubscribe();
    this.loading = true;
    this.error = "";
    this.stream = combineLatest({
      history: this.sesionService.historial$,
      alerts: this.sesionService.alertas$,
      occupancy: this.sesionService.ocupacion$,
      logs: this.sesionService.workoutLogs$ ?? of([]),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.historial = data.history;
          this.alertas = data.alerts;
          this.ocupacion = data.occupancy;
          this.workoutLogs = data.logs;
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
      return (
        this.filtroEstado === "todos" ||
        s.estado.toLowerCase() === this.filtroEstado
      );
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
    void Swal.fire({
      title: "¿Cancelar esta sesión?",
      text:
        "Se cancelará tu reserva de " +
        sesion.clase +
        " del " +
        sesion.fecha +
        " en SQLite.",
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
          this.feedback = "Sesión cancelada correctamente.";
        } catch {
          this.feedback =
            "No se pudo guardar la cancelación. Conservamos el estado anterior.";
          return;
        } finally {
          this.busy = false;
        }
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

  // ── Bitácora de Progreso (HU6) ────────────────────────────────────────
  get volumenTotalKg(): number {
    return Math.round(
      this.workoutLogs.reduce(
        (sum, log) => sum + log.series * log.repeticiones * log.pesoKg,
        0,
      ),
    );
  }

  get pesoMaximoKg(): number {
    if (!this.workoutLogs.length) return 0;
    return Math.max(...this.workoutLogs.map((log) => log.pesoKg));
  }

  async registrarEjercicio(): Promise<void> {
    if (this.busy || !this.sesionService.addWorkoutLog) return;
    if (!this.logDraft.ejercicio.trim() || this.logDraft.series <= 0) {
      this.feedback = "Ingresa el nombre del ejercicio y series válidas.";
      return;
    }
    this.busy = true;
    this.feedback = "";
    try {
      await this.sesionService.addWorkoutLog({ ...this.logDraft });
      this.feedback = "Registro añadido a tu bitácora de progreso.";
      this.logDraft = {
        ...this.logDraft,
        ejercicio: "",
        notas: "",
      };
    } catch {
      this.feedback = "No se pudo guardar el registro en la bitácora.";
    } finally {
      this.busy = false;
    }
  }

  async eliminarRegistro(log: WorkoutLogEntry): Promise<void> {
    if (this.busy || !this.sesionService.deleteWorkoutLog) return;
    this.busy = true;
    this.feedback = "";
    try {
      await this.sesionService.deleteWorkoutLog(log.id);
      this.feedback = "Registro eliminado de la bitácora.";
    } catch {
      this.feedback = "No se pudo eliminar el registro de la bitácora.";
    } finally {
      this.busy = false;
    }
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
      this.feedback = "Aviso marcado como leído.";
    } catch {
      this.feedback = "No se pudo guardar el cambio.";
    } finally {
      this.busy = false;
    }
  }

  async marcarTodasLeidas(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.sesionService.marcarTodasLeidas();
      this.feedback = "Avisos marcados como leídos.";
    } catch {
      this.feedback = "No se pudieron actualizar los avisos.";
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
