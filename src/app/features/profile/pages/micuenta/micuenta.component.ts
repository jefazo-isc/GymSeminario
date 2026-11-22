import { Dialog, DialogModule } from "@angular/cdk/dialog";
import { CommonModule } from "@angular/common";
import { Component, DestroyRef, inject, OnInit } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule, NgForm } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { take } from "rxjs";
import Swal from "sweetalert2";
import { RequestState } from "../../../../core/data-access/request-state";
import { ThemeService } from "../../../../core/theme/theme.service";
import { AppearancePanelComponent } from "../../../../shared/ui/appearance-panel/appearance-panel.component";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { RequestStateComponent } from "../../../../shared/ui/request-state/request-state.component";
import { SESSION } from "../../../auth/data-access/session.repository";
import { PerfilSocio } from "../../../coach/models/rutina.model";
import { PROFILES } from "../../data-access/profile.repository";
import {
  bmiCategory,
  BodyMeasurement,
  calculateBmi,
  createProfileDraft,
} from "../../models/profile.model";

const ADMIN_EMAILS = new Set([
  "guevara.cardona.yahir@gmail.com",
  "admin@gymseminario.com",
]);

@Component({
  selector: "app-micuenta",
  standalone: true,
  imports: [
    CommonModule,
    RequestStateComponent,
    FormsModule,
    RouterLink,
    DialogModule,
    ButtonDirective,
    IconComponent,
  ],
  templateUrl: "./micuenta.component.html",
  styleUrl: "./micuenta.component.css",
})
export class MicuentaComponent implements OnInit {
  private readonly auth = inject(SESSION);
  private readonly profileService = inject(PROFILES);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly theme = inject(ThemeService);

  nombre: string | null = null;
  email: string | null = null;
  role: string | null = null;
  authReady = false;
  authError = "";
  perfil: PerfilSocio = createProfileDraft();
  profileLoading = false;
  profileError = "";
  guardadoExitoso = false;
  saveMessage = "";
  saving = false;
  cloudSynced = false;

  measurements: BodyMeasurement[] = [];
  healthAlerts: string[] = [];
  measurementSaving = false;
  measurementMessage = "";
  cintura: number | null = null;
  pecho: number | null = null;
  brazo: number | null = null;
  grasaCorporal: number | null = null;
  measurementNotas = "";

  objetivos = [
    "Ganancia muscular",
    "Pérdida de grasa / Definición",
    "Fuerza máxima",
    "Acondicionamiento físico",
    "Tonificación general",
  ];
  niveles = ["Principiante", "Intermedio", "Avanzado"];
  opcionesDias = [2, 3, 4, 5, 6];
  generos = ["Masculino", "Femenino", "Otro"];

  constructor() {
    this.auth.userName$.pipe(takeUntilDestroyed()).subscribe((name) => {
      this.nombre = name;
      if (name && (!this.perfil.nombre || this.perfil.nombre === "Socio")) {
        this.perfil.nombre = name;
      }
    });
    this.auth.userRole$
      .pipe(takeUntilDestroyed())
      .subscribe((role) => (this.role = role));
    this.loadProfile();
  }

  get profileState(): RequestState<PerfilSocio> {
    if (this.profileLoading) return { status: "loading" };
    if (this.profileError)
      return {
        status: "error",
        error: { kind: "network", message: this.profileError, retryable: true },
      };
    return { status: "data", data: this.perfil };
  }

  loadProfile() {
    if (this.profileLoading) return;
    this.profileLoading = true;
    this.profileError = "";
    this.profileService.perfil$
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.perfil = { ...profile };
          if (
            this.nombre &&
            (!this.perfil.nombre || this.perfil.nombre === "Socio")
          ) {
            this.perfil.nombre = this.nombre;
          }
          this.profileLoading = false;
        },
        error: () => {
          this.profileLoading = false;
          this.profileError =
            "No se pudo consultar el perfil. No mostramos los valores iniciales como datos confirmados.";
        },
      });
  }

  ngOnInit() {
    const sessionUser =
      this.profileService.getSessionUserInfo?.() ??
      this.auth.getStoredUser?.();
    if (sessionUser) {
      this.email = sessionUser.email;
      this.nombre = sessionUser.nombre || this.nombre;
      if (
        "role" in sessionUser &&
        typeof sessionUser.role === "string" &&
        sessionUser.role
      ) {
        this.role = sessionUser.role;
      }
    }
    this.authReady = true;
    void this.syncFromServer();
  }

  private async syncFromServer() {
    if (this.profileService.syncProfileFromServer) {
      const res = await this.profileService.syncProfileFromServer();
      this.perfil = { ...res.perfil };
      this.cloudSynced = res.synced;
      this.healthAlerts = res.healthAlerts;
    }
    if (this.profileService.loadMeasurements) {
      const mRes = await this.profileService.loadMeasurements();
      this.measurements = mRes.measurements;
      if (mRes.healthAlerts.length) {
        this.healthAlerts = mRes.healthAlerts;
      }
    }
  }

  get imc(): number {
    return calculateBmi(this.perfil.peso, this.perfil.altura);
  }

  get imcLabel(): string {
    return bmiCategory(this.imc);
  }

  get hasMedicalRestriction(): boolean {
    const text = (this.perfil.restriccionesMedicas || "").trim().toLowerCase();
    return Boolean(
      text &&
        !["ninguna", "ninguno", "sin restricciones", "n/a", "no"].includes(text),
    );
  }

  async guardarDatos(form?: NgForm) {
    if (this.saving) return;
    if (form?.invalid) {
      form.form.markAllAsTouched();
      return;
    }
    this.guardadoExitoso = false;
    this.saveMessage = "";
    this.saving = true;
    try {
      await this.profileService.guardarPerfil({ ...this.perfil });
      this.guardadoExitoso = true;
      this.saveMessage = this.cloudSynced
        ? "Perfil actualizado y sincronizado en tu cuenta."
        : "Perfil guardado en este navegador.";
    } catch {
      this.saveMessage =
        "No se pudo guardar el perfil. Conservamos tus campos; revisa tu conexión o almacenamiento e intenta de nuevo.";
    } finally {
      this.saving = false;
    }
  }

  async registrarMedicion() {
    if (this.measurementSaving || !this.profileService.saveMeasurement) return;
    if (
      !Number.isFinite(this.perfil.peso) ||
      this.perfil.peso <= 0 ||
      !Number.isFinite(this.perfil.altura) ||
      this.perfil.altura <= 0
    ) {
      this.measurementMessage =
        "Ingresa un peso y altura válidos en tu perfil antes de registrar una medición.";
      return;
    }

    this.measurementSaving = true;
    this.measurementMessage = "";
    try {
      const res = await this.profileService.saveMeasurement({
        peso: this.perfil.peso,
        altura: this.perfil.altura,
        cintura: this.cintura,
        pecho: this.pecho,
        brazo: this.brazo,
        grasaCorporal: this.grasaCorporal,
        restriccionesMedicas: this.perfil.restriccionesMedicas,
        notas: this.measurementNotas.trim() || undefined,
      });
      this.measurements = [res.measurement, ...this.measurements];
      this.healthAlerts = res.healthAlerts;
      this.measurementNotas = "";
      this.measurementMessage = `Medición registrada (IMC ${res.measurement.imc}).`;
    } catch {
      this.measurementMessage =
        "No se pudo registrar la medición en el servidor. Intenta de nuevo.";
    } finally {
      this.measurementSaving = false;
    }
  }

  get effectiveRole(): "admin" | "receptionist" | "subscriber" | "guest" {
    const email = (this.email || "").toLowerCase().trim();
    const r = (this.role || "").toLowerCase().trim();
    if (ADMIN_EMAILS.has(email) || r === "admin") {
      return "admin";
    }
    if (
      r === "reception" ||
      r === "receptionist" ||
      r === "recepcionista" ||
      r === "staff"
    ) {
      return "receptionist";
    }
    if (r === "subscriber" || r === "subscriptor" || r === "socio") {
      return "subscriber";
    }
    return "guest";
  }

  get roleBadgeLabel(): string {
    switch (this.effectiveRole) {
      case "admin":
        return "👑 Administrador / Gerente";
      case "receptionist":
        return "📋 Recepcionista / Staff";
      case "subscriber":
        return "⚡ Socio Activo / Suscriptor";
      default:
        return "👤 Cuenta (Sin suscripción activa)";
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

  async cerrarSesion() {
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

  openPreferences() {
    this.dialog.open(AppearancePanelComponent, {
      width: "440px",
      maxWidth: "calc(100vw - 24px)",
      panelClass: "grom-dialog",
      backdropClass: "grom-backdrop",
      ariaLabelledBy: "appearance-title",
      autoFocus: ".settings-close",
      restoreFocus: true,
    });
  }
}
