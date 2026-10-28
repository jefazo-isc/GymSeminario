import { CommonModule } from "@angular/common";
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  OnInit,
  Output,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { RequestState } from "../../../../core/data-access/request-state";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { RequestStateComponent } from "../../../../shared/ui/request-state/request-state.component";
import { EXERCISES } from "../../data-access/exercise.repository";
import { ExerciseGroup } from "../../models/exercise.model";
export type {
  ExerciseGroup,
  LibraryExercise,
} from "../../models/exercise.model";
export const normalizeSearch = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es").trim();
@Component({
  selector: "app-ejercicios",
  standalone: true,
  imports: [
    RequestStateComponent,
    CommonModule,
    FormsModule,
    IconComponent,
    ButtonDirective,
  ],
  templateUrl: "./ejercicios.component.html",
  styleUrl: "./ejercicios.component.css",
})
export class EjerciciosComponent implements OnInit {
  @Output() parteSeleccionada = new EventEmitter<string>();
  private exercises = inject(EXERCISES);
  private destroyRef = inject(DestroyRef);
  datosPorParte: ExerciseGroup[] = [];
  datosFiltrados: ExerciseGroup[] = [];
  filtroActual = "";
  grupoFiltro = "";
  equipoFiltro = "";
  loading = false;
  error = "";
  get viewState(): RequestState<unknown> {
    if (this.loading) return { status: "loading" };
    if (this.error)
      return {
        status: "error",
        error: { kind: "network", message: this.error, retryable: true },
      };
    return { status: "data", data: this.datosFiltrados };
  }
  ngOnInit() {
    this.load();
  }
  load() {
    if (this.loading) return;
    this.loading = true;
    this.error = "";
    this.exercises
      .getEjercicios()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.datosPorParte = Array.isArray(r?.datosPorParte)
            ? r.datosPorParte
            : [];
          this.loading = false;
          this.applyFilters();
        },
        error: () => {
          this.loading = false;
          this.error =
            "No pudimos cargar el catálogo de ejercicios. Revisa tu conexión y vuelve a intentarlo.";
        },
      });
  }
  get equipos() {
    const equipment = new Map<string, string>();
    for (const group of this.datosPorParte) {
      for (const exercise of group.ejercicios) {
        for (const raw of exercise.equipo.split(",")) {
          const label = raw.trim();
          const key = normalizeSearch(label);
          if (key && !equipment.has(key))
            equipment.set(
              key,
              label[0].toLocaleUpperCase("es") + label.slice(1),
            );
        }
      }
    }
    return [...equipment.values()].sort((a, b) => a.localeCompare(b, "es"));
  }
  get total() {
    return this.datosFiltrados.reduce((sum, g) => sum + g.ejercicios.length, 0);
  }
  get hasFilters() {
    return !!(this.filtroActual || this.grupoFiltro || this.equipoFiltro);
  }
  onFiltrarEjercicios(term: string) {
    this.filtroActual = term;
    this.applyFilters();
  }
  applyFilters() {
    const q = normalizeSearch(this.filtroActual);
    this.datosFiltrados = this.datosPorParte
      .filter((g) => !this.grupoFiltro || g.parte === this.grupoFiltro)
      .map((g) => ({
        ...g,
        ejercicios: g.ejercicios.filter(
          (e) =>
            (!q ||
              normalizeSearch(
                g.parte + " " + e.nombre + " " + e.equipo,
              ).includes(q)) &&
            (!this.equipoFiltro ||
              (e.equipo || "")
                .split(",")
                .some(
                  (v) =>
                    normalizeSearch(v) === normalizeSearch(this.equipoFiltro),
                )),
        ),
      }))
      .filter((g) => g.ejercicios.length > 0);
  }
  reset() {
    this.filtroActual = "";
    this.grupoFiltro = "";
    this.equipoFiltro = "";
    this.applyFilters();
  }
  seleccionarParte(parte: string) {
    this.parteSeleccionada.emit(parte);
  }
}
