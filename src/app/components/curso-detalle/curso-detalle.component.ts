import { Component, inject } from "@angular/core";
import { RouterLink, ActivatedRoute } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CursoService } from "../../services/curso.service";
import { IconComponent } from "../../shared/ui/icon/icon.component";
import { ButtonDirective } from "../../shared/ui/button.directive";
@Component({
  selector: "app-curso-detalle",
  standalone: true,
  imports: [RouterLink, IconComponent, ButtonDirective],
  templateUrl: "./curso-detalle.component.html",
  styleUrl: "./curso-detalle.component.css",
})
export class CursoDetalleComponent {
  curso: ReturnType<CursoService["getCursoPorId"]>;
  private service = inject(CursoService);
  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const id = Number(params.get("id"));
        this.curso = Number.isFinite(id)
          ? this.service.getCursoPorId(id)
          : undefined;
      });
  }
}
