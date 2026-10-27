import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  DestroyRef,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { IconComponent } from "../../shared/ui/icon/icon.component";
import { ButtonDirective } from "../../shared/ui/button.directive";
export interface LibraryExercise {
  nombre: string;
  series: number | string;
  repeticiones: number | string;
  equipo: string;
}
export interface ExerciseGroup {
  parte: string;
  ejercicios: LibraryExercise[];
}
export const normalizeSearch = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es").trim();
@Component({
  selector: "app-ejercicios",
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ButtonDirective],
  templateUrl: "./ejercicios.component.html",
  styleUrl: "./ejercicios.component.css",
})
export class EjerciciosComponent implements OnInit {
  @Output() parteSeleccionada = new EventEmitter<string>();
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  datosPorParte: ExerciseGroup[] = [];
  datosFiltrados: ExerciseGroup[] = [];
  filtroActual = "";
  grupoFiltro = "";
  equipoFiltro = "";
  loading = false;
  error = "";
  ngOnInit() {
    this.load();
  }
  load() {
    if (this.loading) return;
    this.loading = true;
    this.error = "";
    this.http
      .get<{ datosPorParte: ExerciseGroup[] }>(
        "https://arl150.github.io/ejercicios-api/ejercicios.json",
      )
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
    return [
      ...new Set(
        this.datosPorParte.flatMap((g) =>
          g.ejercicios.flatMap((e) =>
            (e.equipo || "")
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
          ),
        ),
      ),
    ].sort((a, b) => a.localeCompare(b, "es"));
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
                .map((v) => v.trim())
                .includes(this.equipoFiltro)),
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
