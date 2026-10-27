import { Component, inject, signal } from "@angular/core";
import { Router, RouterLink, NavigationEnd } from "@angular/router";
import { Title } from "@angular/platform-browser";
import { filter } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { pageMetaFor } from "../../../core/navigation/page-meta";
@Component({
  selector: "app-route-heading",
  standalone: true,
  imports: [RouterLink],
  template: `@if (meta(); as page) {
    @if (!page.hidden) {
      <header class="route-heading">
        <nav aria-label="Ruta de navegación">
          <a routerLink="/home">Inicio</a><span aria-hidden="true">/</span>
          @if (page.parent) {
            <a [routerLink]="page.parent.url">{{ page.parent.label }}</a
            ><span aria-hidden="true">/</span>
          }
          <span aria-current="page">{{ page.section }}</span>
        </nav>
        <span class="eyebrow">{{ page.section }}</span>
        <h1>{{ page.title }}</h1>
        <p>{{ page.description }}</p>
      </header>
    }
  }`,
  styles: [
    `
      .route-heading {
        padding: 12px 0 32px;
        max-width: 850px;
      }
      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        font-size: 0.75rem;
        color: var(--color-text-secondary);
        margin-bottom: 32px;
      }
      nav a {
        color: var(--color-text-secondary);
        text-decoration: none;
      }
      nav a:hover {
        text-decoration: underline;
      }
      h1 {
        font: 500 clamp(2rem, 4.5vw, 3.3rem) / 1.1 var(--font-sans);
        letter-spacing: -0.055em;
        color: var(--color-text);
        margin: 0 0 16px;
      }
      p {
        max-width: 65ch;
        font-size: 1rem;
        color: var(--color-text-secondary);
        margin: 0;
        line-height: 1.7;
      }
      @media (max-width: 767px) {
        .route-heading {
          padding: 12px 4px 28px;
        }
        nav {
          margin-bottom: 24px;
        }
      }
    `,
  ],
})
export class RouteHeadingComponent {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  readonly meta = signal(pageMetaFor(this.router.url));
  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        const meta = pageMetaFor(e.urlAfterRedirects);
        this.meta.set(meta);
        this.title.setTitle(meta ? `${meta.section} · GROM 21` : "GROM 21");
      });
  }
}
