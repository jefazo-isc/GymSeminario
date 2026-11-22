import { Dialog, DialogModule, DialogRef } from "@angular/cdk/dialog";
import { Overlay } from "@angular/cdk/overlay";
import { CommonModule, DOCUMENT } from "@angular/common";
import {
  Component,
  DestroyRef,
  HostListener,
  TemplateRef,
  ViewChild,
  inject,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatMenuModule } from "@angular/material/menu";
import { NavigationEnd, Router, RouterModule } from "@angular/router";
import { filter } from "rxjs";
import Swal from "sweetalert2";
import { CapacitorNativeService } from "../../../../core/mobile/capacitor-native.service";
import { isMobileVersion } from "../../../../core/mobile/is-mobile";
import { ThemeService } from "../../../../core/theme/theme.service";
import { SESSION } from "../../../../features/auth/data-access/session.repository";
import { AppearancePanelComponent } from "../../../../shared/ui/appearance-panel/appearance-panel.component";
import { BrandComponent } from "../../../../shared/ui/brand/brand.component";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { SearchPanelComponent } from "../../../../shared/ui/search-panel/search-panel.component";

const ADMIN_EMAILS = new Set([
  "guevara.cardona.yahir@gmail.com",
  "admin@gymseminario.com",
]);

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
  host: {
    "[class.is-mobile-header]": "isMobile",
  },
  templateUrl: "./navbar.component.html",
  styleUrl: "./navbar.component.css",
})
export class NavbarComponent {
  readonly isMobile = isMobileVersion();
  readonly theme = inject(ThemeService);
  private readonly auth = inject(SESSION);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly native = inject(CapacitorNativeService, { optional: true });
  @ViewChild("mobileNavigation") mobileNavigationTemplate?: TemplateRef<unknown>;
  private currentDialog?: DialogRef;
  readonly activePath = signal(this.router.url.split("?")[0]);
  readonly mobileOpen = signal(false);
  userName: string | null = null;
  userRole: string | null = null;
  demoRoleOverride: "admin" | "receptionist" | "subscriber" | null = null;
  readonly gymLinks = [
    { path: "/nosotros", label: "Nuestra historia", icon: "user" },
    { path: "/servicio", label: "Servicios", icon: "grid" },
    { path: "/ubicacion", label: "Ubicación y horarios", icon: "pin" },
    { path: "/redes/0", label: "Nuestra comunidad", icon: "spark" },
    { path: "/responsables", label: "Equipo del proyecto", icon: "user" },
  ];
  readonly trainingLinks = [
    { path: "/f3", label: "Acceso rápido QR", icon: "check" },
    { path: "/videos", label: "Guías de entrenamiento", icon: "play" },
    { path: "/coach-ia", label: "Coach virtual IA", icon: "spark" },
    { path: "/productos", label: "Productos", icon: "external" },
  ];
  readonly guestTrainingLinks = [
    { path: "/videos", label: "Guías de entrenamiento", icon: "play" },
    { path: "/productos", label: "Productos", icon: "external" },
  ];
  readonly guestAccountLinks = [
    { path: "/micuenta", label: "Mi perfil y datos", icon: "user" },
    { path: "/membresias", label: "Mi membresía", icon: "user" },
    { path: "/estado-cuenta", label: "Estado de cuenta", icon: "grid" },
    { path: "/change", label: "Cambiar contraseña", icon: "user" },
  ];
  // 1. Opciones de Administrador (Dorado / Ámbar #f59e0b)
  readonly adminLinks = [
    { path: "/graficos", label: "Estadísticas y métricas", icon: "grid" },
    { path: "/editar1", label: "Gestionar agendas", icon: "calendar" },
    { path: "/editar2", label: "Gestionar asistencias", icon: "check" },
  ];

  // 2. Opciones de Recepcionista (Azul Cyan #0ea5e9)
  readonly receptionLinks = [
    { path: "/scanner", label: "Escáner y QR en puerta", icon: "check" },
    { path: "/editar2", label: "Registro de asistencias", icon: "calendar" },
  ];

  // 3. Opciones de Subscriptor / Socio Activo (Verde Esmeralda #10b981)
  readonly subscriberLinks = [
    { path: "/coach-ia", label: "Coach virtual IA", icon: "spark" },
    { path: "/f3", label: "Registrar asistencia QR / Cámara", icon: "check" },
    { path: "/f2", label: "Agendar entrenamiento", icon: "calendar" },
    { path: "/actividad", label: "Mi actividad", icon: "clock" },
    { path: "/membresias", label: "Mi membresía", icon: "user" },
    { path: "/estado-cuenta", label: "Estado de cuenta", icon: "grid" },
    { path: "/micuenta", label: "Mi perfil y datos", icon: "user" },
    { path: "/change", label: "Cambiar contraseña", icon: "user" },
  ];

  constructor() {
    this.auth.userName$
      .pipe(takeUntilDestroyed())
      .subscribe((name) => {
        this.userName = name;
        if (!name) this.demoRoleOverride = null;
      });
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

    if (this.native) {
      this.native.openDrawer$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          if (this.mobileNavigationTemplate && !this.mobileOpen()) {
            this.openMobile(this.mobileNavigationTemplate);
          }
        });

      const unregister = this.native.registerModalCloseHandler(() => {
        if (this.mobileOpen()) {
          this.closeMobile();
          return true;
        }
        return false;
      });
      this.destroyRef.onDestroy(() => unregister());
    }
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

  get visibleTrainingLinks() {
    return this.effectiveRole === "admin" || this.effectiveRole === "subscriber"
      ? this.trainingLinks
      : this.guestTrainingLinks;
  }

  get userEmail(): string {
    try {
      const raw = localStorage.getItem("gym_user");
      if (!raw) return "";
      const u = JSON.parse(raw) as Record<string, unknown>;
      return typeof u["email"] === "string"
        ? u["email"].toLowerCase().trim()
        : "";
    } catch {
      return "";
    }
  }

  get isRealAdmin(): boolean {
    if (!this.userName) return false;
    const rawRole = (this.userRole || "").toLowerCase().trim();
    if (ADMIN_EMAILS.has(this.userEmail) || rawRole === "admin") {
      return true;
    }
    try {
      const raw = localStorage.getItem("gym_user");
      if (!raw) return false;
      const u = JSON.parse(raw) as Record<string, unknown>;
      const storedRole =
        typeof u["role"] === "string" ? u["role"].toLowerCase().trim() : "";
      return storedRole === "admin";
    } catch {
      return false;
    }
  }

  get effectiveRole(): "admin" | "receptionist" | "subscriber" | "guest" {
    if (!this.userName) return "guest";
    if (this.isRealAdmin && this.demoRoleOverride) {
      return this.demoRoleOverride;
    }
    if (this.isRealAdmin) {
      return "admin";
    }
    const r = (this.userRole || "").toLowerCase().trim();

    if (
      r === "reception" ||
      r === "receptionist" ||
      r === "recepcionista" ||
      r === "staff"
    ) {
      return "receptionist";
    }

    if (
      r === "subscriber" ||
      r === "subscriptor" ||
      r === "socio" ||
      r === "trainer" ||
      r === "entrenador"
    ) {
      return "subscriber";
    }

    return "guest";
  }

  get roleBadgeLabel(): string {
    switch (this.effectiveRole) {
      case "admin":
        return "👑 Administrador";
      case "receptionist":
        return "📋 Recepción";
      case "subscriber":
        return "⚡ Socio Activo";
      default:
        return this.userName ? "👤 Cuenta (Sin suscripción)" : "Visitante";
    }
  }

  get roleBadgeClass(): string {
    switch (this.effectiveRole) {
      case "admin":
        return "badge-role--admin";
      case "receptionist":
        return "badge-role--reception";
      case "subscriber":
        return "badge-role--subscriber";
      default:
        return "badge-role--guest";
    }
  }

  setDemoRole(role: "admin" | "receptionist" | "subscriber"): void {
    if (!this.isRealAdmin) return;
    this.demoRoleOverride = role === "admin" ? null : role;
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: `Vista previa de rol: ${this.roleBadgeLabel}`,
      timer: 1800,
      showConfirmButton: false,
    });
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
    const result = await Swal.fire({
      title: "¿Cerrar sesión?",
      text: "¿Estás seguro de que deseas salir de tu cuenta?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, cerrar sesión",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
    });

    if (!result.isConfirmed) return;

    this.closeMobile();
    this.demoRoleOverride = null;
    await this.auth.cerrarSesion();
    await Swal.fire({
      icon: "success",
      title: "Sesión cerrada",
      text: "Has salido de tu cuenta correctamente.",
      timer: 1500,
      timerProgressBar: true,
      showConfirmButton: false,
    });
    await this.router.navigate(["/home"]);
  }

  @HostListener("document:keydown", ["$event"])
  handleShortcut(event: KeyboardEvent): void {
    if (this.effectiveRole === "receptionist") return;
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
