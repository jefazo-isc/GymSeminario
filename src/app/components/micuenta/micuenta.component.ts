import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, NgForm } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Dialog, DialogModule } from "@angular/cdk/dialog";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { AuthService } from "../../auth/data-access/auth.service";
import { PerfilSocioService } from "../../services/perfil-socio.service";
import { PerfilSocio } from "../../models/rutina.model";
import { ThemeService } from "../../core/theme/theme.service";
import { AppearancePanelComponent } from "../../shared/ui/appearance-panel/appearance-panel.component";
import { ButtonDirective } from "../../shared/ui/button.directive";
import { IconComponent } from "../../shared/ui/icon/icon.component";
@Component({
  selector: "app-micuenta",
  standalone: true,
  imports: [
    CommonModule,
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
  private auth = inject(AuthService);
  private profileService = inject(PerfilSocioService);
  private dialog = inject(Dialog);
  readonly theme = inject(ThemeService);
  nombre: string | null = null;
  email: string | null = null;
  role: string | null = null;
  authReady = false;
  authError = "";
  perfil: PerfilSocio = { ...this.profileService.getPerfilActual() };
  guardadoExitoso = false;
  saveMessage = "";
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
  guardarDatos(form?: NgForm) {
    if (form?.invalid) {
      form.form.markAllAsTouched();
      return;
    }
    this.profileService.guardarPerfil({ ...this.perfil });
    this.guardadoExitoso = true;
    try {
      const saved = localStorage.getItem("gym_perfil_socio");
      this.saveMessage =
        saved &&
        JSON.stringify(JSON.parse(saved)) === JSON.stringify(this.perfil)
          ? "Perfil guardado en este navegador."
          : "El perfil está disponible durante esta visita; no se pudo comprobar su persistencia.";
    } catch {
      this.saveMessage =
        "Perfil actualizado durante esta visita. El almacenamiento local no está disponible.";
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
