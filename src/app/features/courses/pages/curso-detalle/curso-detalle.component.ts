import { Component, DestroyRef, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { COURSES } from "../../data-access/course.repository";
import { Curso } from "../../models/course.model";
import { RequestState } from "../../../../core/data-access/request-state";
import { RequestStateComponent } from "../../../../shared/ui/request-state/request-state.component";
@Component({
  selector: "app-curso-detalle",
  standalone: true,
  imports: [RouterLink, IconComponent, ButtonDirective, RequestStateComponent],
  templateUrl: "./curso-detalle.component.html",
  styleUrl: "./curso-detalle.component.css",
})
export class CursoDetalleComponent {
  curso: Curso | undefined;
  private catalog: Curso[] = [];
  private selectedId: number | null = null;
  private destroyRef = inject(DestroyRef);
  loading = false;
  error = "";
  private service = inject(COURSES);
  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const id = Number(params.get("id"));
        this.selectedId = Number.isFinite(id) ? id : null;
        this.resolveCourse();
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
    return { status: "data", data: this.catalog };
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
          this.resolveCourse();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.error =
            "No se pudo consultar el catálogo. Puedes volver a intentar.";
        },
      });
  }
  private resolveCourse() {
    this.curso = this.catalog.find((course) => course.id === this.selectedId);
  }
}
