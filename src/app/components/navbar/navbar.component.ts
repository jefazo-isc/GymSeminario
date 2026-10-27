import { CommonModule, DOCUMENT } from "@angular/common";
import {
  Component,
  DestroyRef,
  HostListener,
  TemplateRef,
  inject,
  signal,
} from "@angular/core";
import { Router, RouterModule, NavigationEnd } from "@angular/router";
import { MatMenuModule } from "@angular/material/menu";
import { Dialog, DialogModule, DialogRef } from "@angular/cdk/dialog";
import { Overlay } from "@angular/cdk/overlay";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { filter } from "rxjs";
import { AuthService } from "../../auth/data-access/auth.service";
import { ThemeService } from "../../core/theme/theme.service";
import { IconComponent } from "../../shared/ui/icon/icon.component";
import { BrandComponent } from "../../shared/ui/brand/brand.component";
import { ButtonDirective } from "../../shared/ui/button.directive";
import { AppearancePanelComponent } from "../../shared/ui/appearance-panel/appearance-panel.component";
import { SearchPanelComponent } from "../../shared/ui/search-panel/search-panel.component";

@Component({
  selector: "app-navbar",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatMenuModule,
    DialogModule,
    IconComponent,
    BrandComponent,
    ButtonDirective,
  ],
  templateUrl: "./navbar.component.html",
  styleUrl: "./navbar.component.css",
})
export class NavbarComponent {
  readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private currentDialog?: DialogRef;
  readonly activePath = signal(this.router.url.split("?")[0]);
  readonly mobileOpen = signal(false);
  userName: string | null = null;
  userRole: string | null = null;
  readonly gymLinks = [
    { path: "/nosotros", label: "Nuestra historia", icon: "user" },
    { path: "/servicio", label: "Servicios", icon: "grid" },
    { path: "/ubicacion", label: "Ubicación y horarios", icon: "pin" },
    { path: "/redes/0", label: "Nuestra comunidad", icon: "spark" },
    { path: "/responsables", label: "Equipo del proyecto", icon: "user" },
  ];
  readonly trainingLinks = [
    { path: "/ejercicios", label: "Explorar ejercicios", icon: "grid" },
    { path: "/videos", label: "Guías de entrenamiento", icon: "play" },
    { path: "/coach-ia", label: "Coach virtual IA", icon: "spark" },
    { path: "/productos", label: "Productos", icon: "external" },
  ];
  readonly memberLinks = [
    { path: "/micuenta", label: "Mi cuenta", icon: "user" },
    { path: "/f2", label: "Agendar entrenamiento", icon: "calendar" },
    { path: "/f3", label: "Registrar asistencia", icon: "check" },
    { path: "/actividad", label: "Mi actividad", icon: "clock" },
    { path: "/estado-cuenta", label: "Estado de cuenta", icon: "grid" },
    { path: "/membresias", label: "Mi membresía", icon: "user" },
    { path: "/change", label: "Cambiar contraseña", icon: "user" },
  ];
  readonly adminLinks = [
    { path: "/graficos", label: "Estadísticas", icon: "grid" },
    { path: "/editar1", label: "Gestionar agendas", icon: "calendar" },
    { path: "/editar2", label: "Gestionar asistencias", icon: "check" },
  ];

  constructor() {
    this.auth.userName$
      .pipe(takeUntilDestroyed())
      .subscribe((name) => (this.userName = name));
    this.auth.userRole$
      .pipe(takeUntilDestroyed())
      .subscribe((role) => (this.userRole = role));
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.activePath.set(this.router.url.split("?")[0]);
        this.currentDialog?.close();
        if (event.id > 1) {
          this.document
            .getElementById("main-content")
            ?.focus({ preventScroll: true });
        }
      });
    this.destroyRef.onDestroy(() => this.currentDialog?.close());
  }

  get initials(): string {
    return (this.userName || "Socio")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }
  isActive(links: { path: string }[]): boolean {
    return links.some((link) => link.path === this.activePath());
  }

  openPreferences(): void {
    this.currentDialog?.close();
    this.currentDialog = this.dialog.open(AppearancePanelComponent, {
      width: "440px",
      maxWidth: "calc(100vw - 24px)",
      panelClass: "grom-dialog",
      backdropClass: "grom-backdrop",
      ariaLabelledBy: "appearance-title",
      autoFocus: ".settings-close",
      restoreFocus: true,
    });
  }

  openSearch(): void {
    if (this.dialog.openDialogs.length) return;
    this.currentDialog = this.dialog.open(SearchPanelComponent, {
      width: "640px",
      maxWidth: "calc(100vw - 24px)",
      panelClass: "grom-dialog",
      backdropClass: "grom-backdrop",
      ariaLabelledBy: "search-title",
      autoFocus: "#course-search",
      restoreFocus: true,
    });
  }

  openMobile(template: TemplateRef<unknown>): void {
    this.mobileOpen.set(true);
    this.currentDialog = this.dialog.open(template, {
      width: "min(400px, 100vw)",
      height: "100dvh",
      maxWidth: "100vw",
      panelClass: ["grom-dialog", "grom-dialog--mobile"],
      backdropClass: "grom-backdrop",
      ariaLabelledBy: "mobile-title",
      autoFocus: ".mobile-close",
      restoreFocus: true,
      positionStrategy: this.overlay.position().global().top("0").right("0"),
    });
    this.currentDialog.closed
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.mobileOpen.set(false));
  }

  closeMobile(): void {
    this.currentDialog?.close();
  }
  async logOut(): Promise<void> {
    this.closeMobile();
    await this.auth.cerrarSesion();
  }

  @HostListener("document:keydown", ["$event"])
  handleShortcut(event: KeyboardEvent): void {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "k" &&
      !event.repeat
    ) {
      event.preventDefault();
      this.openSearch();
    }
  }
}
