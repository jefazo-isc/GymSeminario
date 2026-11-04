import { Component, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
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
export class PhoneComponent {
  private service = inject(SESSION);
  private router = inject(Router);

  phoneNumber = "";
  otp = "";
  message = "";
  hint = "";
  busy = false;
  codigoEnviado = false;
  usuarioLogueado = false;
  nombreUsuario: string | null = null;

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

  esNumeroValido() {
    return /^\+[1-9]\d{7,14}$/.test(this.phoneNumber.trim());
  }

  async enviarCodigo() {
    if (!this.esNumeroValido()) return;
    this.busy = true;
    this.message = "";
    try {
      const resp = (await this.service.sendPhoneCode(this.phoneNumber.trim(), null)) as { mensaje?: string } | undefined;
      this.codigoEnviado = true;
      this.hint = resp?.mensaje ?? "Código enviado. Para demo usa: 123456";
    } catch (err) {
      this.message = authErrorMessage(err);
    } finally {
      this.busy = false;
    }
  }

  async verificarCodigo() {
    if (this.otp.length !== 6) return;
    this.busy = true;
    this.message = "";
    try {
      await this.service.verifyPhoneCode(this.phoneNumber.trim(), this.otp);
      await this.router.navigate(["/home"]);
    } catch (err) {
      this.message = authErrorMessage(err);
    } finally {
      this.busy = false;
    }
  }

  reiniciar() {
    this.codigoEnviado = false;
    this.otp = "";
    this.message = "";
    this.hint = "";
  }
}
