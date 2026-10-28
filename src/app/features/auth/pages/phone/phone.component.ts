import { Component, OnDestroy, OnInit, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { ConfirmationResult, onAuthStateChanged } from "firebase/auth";
import { authErrorMessage } from "../../../../core/auth/auth-feedback";
import { CaptchaController } from "../../../../core/auth/captcha-controller";
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
  private auth = this.service.auth;
  readonly captcha = new CaptchaController(this.auth, "recaptcha-container");
  phoneNumber = "";
  otp = "";
  message = "";
  busy = false;
  btnVerificar = false;
  usuarioLogueado = false;
  nombreUsuario: string | null = null;
  private confirmation?: ConfirmationResult;
  private unsubscribeAuth?: () => void;
  constructor() {
    this.service.userName$
      .pipe(takeUntilDestroyed())
      .subscribe((name) => (this.nombreUsuario = name));
  }
  ngOnInit() {
    this.captcha.init();
    this.unsubscribeAuth = onAuthStateChanged(
      this.auth,
      (user) => (this.usuarioLogueado = !!user),
    );
  }
  ngOnDestroy() {
    this.unsubscribeAuth?.();
    this.captcha.destroy();
  }
  esNumeroValido() {
    return /^\+[1-9]\d{7,14}$/.test(this.phoneNumber.trim());
  }
  async enviarCodigo() {
    if (
      this.busy ||
      !this.esNumeroValido() ||
      !this.captcha.resolved() ||
      !this.captcha.instance
    )
      return;
    this.busy = true;
    this.message = "";
    try {
      this.confirmation = await this.service.sendPhoneCode(
        this.phoneNumber.trim(),
        this.captcha.instance,
      );
      this.btnVerificar = true;
      this.captcha.resolved.set(false);
    } catch (error) {
      this.message = authErrorMessage(error);
      this.captcha.init();
    } finally {
      this.busy = false;
    }
  }
  async verificarCodigo() {
    if (this.busy || !this.confirmation || !/^\d{6}$/.test(this.otp)) return;
    this.busy = true;
    this.message = "";
    try {
      const result = await this.confirmation.confirm(this.otp);
      await this.buscarUsuarioPorTelefono(this.phoneNumber.trim());
      await this.service.loadUserRole(result.user.uid, this.phoneNumber.trim());
      this.usuarioLogueado = true;
      this.btnVerificar = false;
    } catch (error) {
      this.message = authErrorMessage(error);
    } finally {
      this.busy = false;
    }
  }
  async buscarUsuarioPorTelefono(phone: string) {
    return this.service.lookupPhone(phone);
  }
}
