import { createProfileDraft } from "../../models/profile.model";
import { DestroyRef } from "@angular/core";
import { take } from "rxjs";
import { RequestState } from "../../../../core/data-access/request-state";
import { RequestStateComponent } from "../../../../shared/ui/request-state/request-state.component";
import { Dialog, DialogModule } from "@angular/cdk/dialog";
import { CommonModule } from "@angular/common";
import { Component, inject, OnInit } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule, NgForm } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { ThemeService } from "../../../../core/theme/theme.service";
import { AppearancePanelComponent } from "../../../../shared/ui/appearance-panel/appearance-panel.component";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { SESSION } from "../../../auth/data-access/session.repository";
import { PerfilSocio } from "../../../coach/models/rutina.model";
import { PROFILES } from "../../data-access/profile.repository";
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
  private auth = inject(SESSION);
  private profileService = inject(PROFILES);
  private dialog = inject(Dialog);
  readonly theme = inject(ThemeService);
  nombre: string | null = null;
  email: string | null = null;
  role: string | null = null;
  authReady = false;
  authError = "";
  perfil: PerfilSocio = createProfileDraft();
  private destroyRef = inject(DestroyRef);
  profileLoading = false;
  profileError = "";
  guardadoExitoso = false;
  saveMessage = "";
  saving = false;
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
      if (name && (!this.perfil.nombre || this.perfil.nombre === "Socio"))
        this.perfil.nombre = name;
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
          )
            this.perfil.nombre = this.nombre;
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
    this.auth
      .getCurrentUser()
      .then((user) => {
        this.email = user?.email || null;
        this.nombre = user?.displayName || this.nombre;
        this.authReady = true;
      })
      .catch(() => {
        this.authReady = true;
        this.authError = "No se pudo consultar la sesión de Firebase.";
      });
  }
  get imc() {
    if (!this.perfil.peso || !this.perfil.altura) return 0;
    return Number(
      (this.perfil.peso / (this.perfil.altura / 100) ** 2).toFixed(1),
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
      this.saveMessage = "Perfil guardado en este navegador.";
    } catch {
      this.saveMessage =
        "No se pudo guardar el perfil. Conservamos tus campos; revisa el almacenamiento del navegador y vuelve a intentar.";
    } finally {
      this.saving = false;
    }
  }
  cerrarSesion() {
    void this.auth.cerrarSesion();
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
