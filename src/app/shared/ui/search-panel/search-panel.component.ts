import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DialogRef } from "@angular/cdk/dialog";
import { Router } from "@angular/router";
import { ButtonDirective } from "../button.directive";
import { IconComponent } from "../icon/icon.component";

@Component({
  selector: "app-search-panel",
  standalone: true,
  imports: [FormsModule, IconComponent, ButtonDirective],
  template: ` <div class="search-panel">
    <header>
      <div>
        <span class="ui-eyebrow">Encuentra tu próximo reto</span>
        <h2 id="search-title">¿Qué quieres entrenar?</h2>
      </div>
      <button
        class="ui-icon-button"
        type="button"
        aria-label="Cerrar búsqueda"
        (click)="dialog.close()"
      >
        <app-icon name="close" />
      </button>
    </header>
    <form (ngSubmit)="search()">
      <label for="course-search">Buscar cursos</label>
      <div class="search-field">
        <app-icon name="search" /><input
          id="course-search"
          name="course"
          [(ngModel)]="term"
          maxlength="80"
          placeholder="Yoga, spinning, pilates…"
          autocomplete="off"
        /><button appButton="primary" type="submit" [disabled]="!term.trim()">
          Buscar<app-icon name="arrow" />
        </button>
      </div>
    </form>
    <div class="suggestions">
      <span>Explora por interés</span>
      @for (suggestion of suggestions; track suggestion) {
        <button type="button" (click)="search(suggestion)">
          {{ suggestion }}<app-icon name="external" />
        </button>
      }
    </div>
    <p>Encuentra clases y descubre nuevas formas de moverte.</p>
  </div>`,
  styles: [
    ":host{display:block}.search-panel{padding:32px}header{display:flex;justify-content:space-between;gap:12px}h2{font:500 clamp(1.4rem,4vw,1.9rem)/1.2 var(--font-sans);letter-spacing:-.045em;margin:10px 0 26px}header button{margin:-12px -12px 0 0}label{font-size:.75rem;font-weight:500;margin-bottom:8px}.search-field{display:flex;align-items:center;gap:12px;border:1px solid var(--color-border-strong);border-radius:var(--radius-md);padding:8px 8px 8px 16px;background:var(--color-bg)}.search-field:focus-within{outline:2px solid var(--color-focus);outline-offset:3px}.search-field>app-icon{color:var(--color-text-secondary)}input{min-width:0;flex:1;border:0;outline:none;background:transparent;color:var(--color-text);font-size:.875rem}input::placeholder{color:var(--color-text-secondary)}.suggestions{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:24px}.suggestions>span{width:100%;font-size:.6875rem;color:var(--color-text-secondary);margin-bottom:4px}.suggestions button{display:flex;gap:6px;align-items:center;border:1px solid var(--color-border);border-radius:var(--radius-pill);background:var(--color-surface);padding:7px 12px;color:var(--color-text);font-size:.75rem}.suggestions button:hover{background:var(--color-accent-soft);border-color:var(--color-accent)}.suggestions app-icon{font-size:.6875rem}p{font-size:.75rem;color:var(--color-text-secondary);border-top:1px solid var(--color-border);padding-top:20px;margin:24px 0 0}@media(max-width:480px){.search-panel{padding:24px}.search-field{flex-wrap:wrap;gap:8px}.search-field input{width:calc(100% - 40px)}.search-field .ui-button{width:100%;margin-top:8px}.search-field>app-icon{width:18px}}",
  ],
})
export class SearchPanelComponent {
  readonly dialog = inject(DialogRef);
  private readonly router = inject(Router);
  readonly suggestions = ["Yoga", "Spinning", "Pilates"];
  term = "";
  search(term = this.term): void {
    const query = term.trim();
    if (!query) return;
    this.dialog.close();
    void this.router.navigate(["/buscar"], { queryParams: { q: query } });
  }
}
