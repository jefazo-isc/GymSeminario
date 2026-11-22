import { Dialog, DialogModule, DialogRef } from "@angular/cdk/dialog";
import { Overlay } from "@angular/cdk/overlay";
import { CommonModule, DOCUMENT } from "@angular/common";
import {
  Component,
  DestroyRef,
  HostListener,
  TemplateRef,
  inject,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatMenuModule } from "@angular/material/menu";
import { NavigationEnd, Router, RouterModule } from "@angular/router";
import { filter } from "rxjs";
import Swal from "sweetalert2";
import { ThemeService } from "../../../../core/theme/theme.service";
import { SESSION } from "../../../../features/auth/data-access/session.repository";
import { AppearancePanelComponent } from "../../../../shared/ui/appearance-panel/appearance-panel.component";
import { BrandComponent } from "../../../../shared/ui/brand/brand.component";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { SearchPanelComponent } from "../../../../shared/ui/search-panel/search-panel.component";

import { isMobileVersion } from "../../../../core/mobile/is-mobile";

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
  readonly isMobile = isMobileVersion();
  readonly theme = inject(ThemeService);
  private readonly auth = inject(SESSION);
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
  // 1. Opciones de Administrador (Dorado / Ámbar #f59e0b)
  readonly adminLinks = [
    { path: "/graficos", label: "Estadísticas y métricas", icon: "grid" },
    { path: "/editar1", label: "Gestionar agendas", icon: "calendar" },
    { path: "/editar2", label: "Gestionar asistencias", icon: "check" },
  ];

  // 2. Opciones de Recepcionista (Azul Cyan #0ea5e9)
  readonly receptionLinks = [
    { path: "/f3", label: "Registrar asistencia (Check-in)", icon: "check" },
    { path: "/f2", label: "Agendar entrenamiento", icon: "calendar" },
    { path: "/actividad", label: "Bitácora de actividad", icon: "clock" },
  ];

  // 3. Opciones de Subscriptor / Socio Activo (Verde Esmeralda #10b981)
  readonly subscriberLinks = [
    { path: "/coach-ia", label: "Coach virtual IA", icon: "spark" },
    { path: "/membresias", label: "Mi membresía", icon: "user" },
    { path: "/estado-cuenta", label: "Estado de cuenta", icon: "grid" },
    { path: "/micuenta", label: "Mi perfil y datos", icon: "user" },
    { path: "/change", label: "Cambiar contraseña", icon: "user" },
  ];

  // Enlaces restringidos cuando no hay registro ni suscripción activa
  readonly restrictedGuestLinks = [
    { label: "Coach virtual IA", icon: "spark", feature: "Rutinas con IA generativa Gemini" },
    { label: "Agendar entrenamiento", icon: "calendar", feature: "Reservas y cupos exclusivos" },
    { label: "Registrar asistencia", icon: "check", feature: "Check-in por código QR o mostrador" },
    { label: "Estado de cuenta", icon: "grid", feature: "Historial de pagos y membresías" },
    { label: "Panel de administración", icon: "grid", feature: "Métricas del gimnasio" },
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

  get userEmail(): string {
    try {
      const raw = localStorage.getItem("gym_user");
      if (!raw) return "";
      const u = JSON.parse(raw);
      return (u?.email || "").toLowerCase().trim();
    } catch {
      return "";
    }
  }

  get effectiveRole(): "admin" | "receptionist" | "subscriber" | "guest" {
    if (!this.userName) return "guest";
    const email = this.userEmail;
    const r = (this.userRole || "").toLowerCase();

    // Administrador: Únicamente Yahir (o email admin@gymseminario.com o rol explícito admin)
    if (
      email === "guevara.cardona.yahir@gmail.com" ||
      email === "admin@gymseminario.com" ||
      r === "admin" ||
      this.userName.toLowerCase().includes("yahir")
    ) {
      return "admin";
    }

    if (r === "receptionist" || r === "recepcionista" || r === "staff") {
      return "receptionist";
    }

    if (r === "subscriber" || r === "subscriptor" || r === "socio") {
      return "subscriber";
    }

    // Cualquier otra cuenta de Google o usuario registrado sin suscripción pagada es "guest" (opciones tachadas)
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
    this.userRole = role;
    const raw = localStorage.getItem("gym_user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        u.role = role;
        localStorage.setItem("gym_user", JSON.stringify(u));
      } catch {
        /* noop */
      }
    }
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: `Rol cambiado a: ${this.roleBadgeLabel}`,
      timer: 1800,
      showConfirmButton: false,
    });
  }

  promptLockedFeature(event: Event, featureName: string): void {
    event.preventDefault();
    event.stopPropagation();
    void Swal.fire({
      icon: "info",
      title: "🔒 Función Exclusiva para Socios",
      html: `
        <p style="margin-bottom: 12px; font-size: 0.95rem; color: #374151;">
          La opción <strong>${featureName}</strong> requiere contar con una membresía activa o un perfil autorizado en <strong>espacioGYM</strong>.
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 0.825rem; text-align: left; line-height: 1.6; margin-top: 10px;">
          <div style="color: #b45309; font-weight: 600;">👑 <strong>Admin (Dorado):</strong> Métricas globales y gestión</div>
          <div style="color: #0369a1; font-weight: 600;">📋 <strong>Recepción (Cyan):</strong> Control de accesos y agendas</div>
          <div style="color: #047857; font-weight: 600;">⚡ <strong>Socio Activo (Verde):</strong> Coach IA, reservas y cuenta</div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "✨ Ver Membresías",
      cancelButtonText: "Iniciar Sesión",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#0ea5e9",
      showCloseButton: true,
    }).then((result) => {
      this.closeMobile();
      if (result.isConfirmed) {
        void this.router.navigate(["/membresias"]);
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        void this.router.navigate(["/auth/sign-in"]);
      }
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
