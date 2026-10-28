import { Component, inject } from "@angular/core";
import { BrowserStorage } from "../../../core/storage/browser-storage.service";
@Component({
  selector: "app-storage-notice",
  standalone: true,
  template: `@if (hasIssues()) {
    <aside class="notice notice--warning" role="status">
      <p>
        <strong>Revisa los datos de este navegador.</strong> No pudimos leer una
        copia local compatible. Se muestran ejemplos; conservamos el contenido
        original y bloqueamos su reemplazo para evitar perderlo. Puedes exportar
        una copia desde las herramientas del navegador antes de recuperarlo.
      </p>
    </aside>
  }`,
  styles: [
    `
      :host {
        display: block;
      }
      :host:has(aside) {
        margin-bottom: 24px;
      }
    `,
  ],
})
export class StorageNoticeComponent {
  readonly storage = inject(BrowserStorage);
  hasIssues() {
    return Object.keys(this.storage.issues()).length > 0;
  }
}
