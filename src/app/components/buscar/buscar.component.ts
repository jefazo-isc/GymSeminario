import { Component, DestroyRef, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink, ActivatedRoute } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CursoService } from "../../services/curso.service";
import { IconComponent } from "../../shared/ui/icon/icon.component";
import { ButtonDirective } from "../../shared/ui/button.directive";
@Component({
  selector: "app-buscar",
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, ButtonDirective],
  templateUrl: "./buscar.component.html",
  styleUrl: "./buscar.component.css",
})
export class BuscarComponent {
  query = "";
  resultados: ReturnType<CursoService["buscarCursos"]> = [];
  private router = inject(Router);
  private service = inject(CursoService);
  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.query = params.get("q") || "";
        this.resultados = this.service.buscarCursos(this.query);
      });
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
