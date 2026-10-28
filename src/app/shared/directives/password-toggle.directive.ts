import { Directive, computed, signal } from "@angular/core";
@Directive({
  selector: "input[appPassword]",
  standalone: true,
  exportAs: "appPassword",
  host: { "[type]": "visible() ? 'text' : 'password'" },
})
export class PasswordToggleDirective {
  readonly visible = signal(false);
  readonly label = computed(() => (this.visible() ? "Ocultar" : "Mostrar"));
  toggle() {
    this.visible.update((value) => !value);
  }
}
