import { Component, DestroyRef, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { COURSES } from "../../data-access/course.repository";
import { Curso } from "../../models/course.model";
import { RequestState } from "../../../../core/data-access/request-state";
import { RequestStateComponent } from "../../../../shared/ui/request-state/request-state.component";
@Component({
  selector: "app-buscar",
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    IconComponent,
    ButtonDirective,
    RequestStateComponent,
  ],
  templateUrl: "./buscar.component.html",
  styleUrl: "./buscar.component.css",
})
export class BuscarComponent {
  query = "";
  resultados: Curso[] = [];
  private catalog: Curso[] = [];
  private destroyRef = inject(DestroyRef);
  loading = false;
  error = "";
  private router = inject(Router);
  private service = inject(COURSES);
  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.query = params.get("q") || "";
        this.filter();
      });
    this.loadCatalog();
  }
  get viewState(): RequestState<Curso[]> {
    if (this.loading) return { status: "loading" };
    if (this.error)
      return {
        status: "error",
        error: { kind: "network", message: this.error, retryable: true },
      };
    return { status: "data", data: this.resultados };
  }
  loadCatalog() {
    if (this.loading) return;
    this.loading = true;
    this.error = "";
    this.service
      .loadCatalog()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (courses) => {
          this.catalog = courses;
          this.filter();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.error =
            "No se pudo consultar el catálogo de cursos. Conservamos tu búsqueda.";
        },
      });
  }
  private filter() {
    this.resultados = this.catalog.filter((course) =>
      course.nombre
        .toLocaleLowerCase("es")
        .includes(this.query.toLocaleLowerCase("es")),
    );
  }
  search() {
    void this.router.navigate(["/buscar"], {
      queryParams: this.query.trim() ? { q: this.query.trim() } : {},
    });
  }
  clear() {
    this.query = "";
    this.search();
  }
}
