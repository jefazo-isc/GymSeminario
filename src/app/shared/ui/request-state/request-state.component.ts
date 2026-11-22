import { Component, input, output } from "@angular/core";
import { RequestState } from "../../../core/data-access/request-state";
import { ButtonDirective } from "../button.directive";
import { IconComponent } from "../icon/icon.component";

@Component({
  selector: "app-request-state",
  standalone: true,
  imports: [ButtonDirective, IconComponent],
  template: `@switch (state().status) {
    @case ("initial") {
      <p class="help" role="status">{{ initialLabel() }}</p>
    }
    @case ("loading") {
      <div class="surface request-loading-container" role="status" aria-busy="true">
        <p>{{ loadingLabel() }}</p>
        <div class="loading-line" aria-hidden="true"></div>
        <div class="skeleton-grid" aria-hidden="true">
          <div class="skeleton-box skeleton-item"></div>
          <div class="skeleton-box skeleton-item"></div>
          <div class="skeleton-box skeleton-item"></div>
        </div>
      </div>
    }
    @case ("empty") {
      <div class="empty-state" role="status">
        <app-icon name="search" />
        <h2>{{ emptyLabel() }}</h2>
        <p>{{ emptyHelp() }}</p>
      </div>
    }
    @case ("error") {
      <div class="empty-state" role="alert">
        <app-icon name="grid" />
        <h2>{{ errorLabel() }}</h2>
        <p>{{ errorMessage() }}</p>
        @if (retryable()) {
          <button
            appButton="secondary"
            type="button"
            [disabled]="busy()"
            (click)="retry.emit()"
          >
            Reintentar
          </button>
        }
      </div>
    }
  }`,
  styles: [
    ":host{display:block}:host:empty{display:none}.skeleton-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-top:16px}.skeleton-item{height:100px;border-radius:var(--radius-sm)}",
  ],
})
export class RequestStateComponent {
  readonly state = input.required<RequestState<unknown>>();
  readonly loadingLabel = input("Consultando datos…");
  readonly initialLabel = input("Consulta pendiente.");
  readonly emptyLabel = input("No hay resultados.");
  readonly emptyHelp = input("Prueba con otros filtros.");
  readonly errorLabel = input("No se pudieron consultar los datos.");
  readonly busy = input(false);
  readonly retry = output<void>();
  errorMessage(): string {
    const state = this.state();
    return state.status === "error" ? state.error.message : "";
  }
  retryable(): boolean {
    const state = this.state();
    return state.status === "error" && state.error.retryable;
  }
}
