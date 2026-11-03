import { Component, OnDestroy, OnInit, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { signal } from "@angular/core";
import { authErrorMessage } from "../../../../core/auth/auth-feedback";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { SESSION } from "../../data-access/session.repository";

@Component({
  selector: "app-phone",
  standalone: true,
  imports: [FormsModule, RouterLink, ButtonDirective],
  templateUrl: "./phone.component.html",
  styleUrl: "./phone.component.css",
})
export class PhoneComponent implements OnInit, OnDestroy {
  private service = inject(SESSION);
  phoneNumber = "";
  otp = "";
  message = "La autenticación por teléfono no está disponible. Usa tu correo y contraseña.";
  busy = false;
  btnVerificar = false;
  usuarioLogueado = false;
  nombreUsuario: string | null = null;

  // Stub para compatibilidad con la plantilla HTML que usa captcha.resolved() / captcha.ready()
  readonly captcha = {
    resolved: signal(true),
    ready: signal(true),
    error: signal(""),
    init: () => {},
    destroy: () => {},
    instance: undefined as undefined,
  };

  constructor() {
    this.service.userName$
      .pipe(takeUntilDestroyed())
      .subscribe((name) => (this.nombreUsuario = name));
    this.service.userUid$
      .pipe(takeUntilDestroyed())
      .subscribe((uid) => (this.usuarioLogueado = !!uid));
  }

  ngOnInit() { /* noop */ }
  ngOnDestroy() { /* noop */ }

  esNumeroValido() {
    return /^\+[1-9]\d{7,14}$/.test(this.phoneNumber.trim());
  }

  async enviarCodigo() {
    this.message = "La autenticación por teléfono no está disponible. Usa tu correo y contraseña.";
  }

  async verificarCodigo() {
    this.message = authErrorMessage(new Error("Autenticación por teléfono no disponible."));
  }

  async buscarUsuarioPorTelefono(_phone: string) { /* noop */ }
}
