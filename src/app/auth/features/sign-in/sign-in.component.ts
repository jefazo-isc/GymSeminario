import { Component, inject, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { getAuth } from "firebase/auth";
import { AuthService } from "../../data-access/auth.service";
import { CaptchaController } from "../../../core/auth/captcha-controller";
import { authErrorMessage } from "../../../core/auth/auth-feedback";
import { PasswordToggleDirective } from "../../../shared/ui/password-toggle.directive";
import { ButtonDirective } from "../../../shared/ui/button.directive";
import { IconComponent } from "../../../shared/ui/icon/icon.component";
@Component({
  selector: "app-sign-in",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PasswordToggleDirective,
    ButtonDirective,
    IconComponent,
  ],
  templateUrl: "./sign-in.component.html",
  styleUrl: "./sign-in.component.css",
})
export default class SignInComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private service = inject(AuthService);
  private router = inject(Router);
  readonly captcha = new CaptchaController(
    this.service.auth,
    "sign-in-recaptcha",
  );
  busy: "email" | "google" | null = null;
  message = "";
  readonly form = this.fb.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", Validators.required],
  });
  ngOnInit() {
    this.captcha.init();
  }
  ngOnDestroy() {
    this.captcha.destroy();
  }
  invalid(name: string) {
    const c = this.form.get(name);
    return !!(c?.invalid && c.touched);
  }
  async conGoogle() {
    if (this.busy) return;
    this.busy = "google";
    this.message = "";
    try {
      await this.service.signInWithGoogle();
      await this.router.navigate(["/home"]);
    } catch (error) {
      this.message = authErrorMessage(error);
    } finally {
      this.busy = null;
    }
  }
  async submit() {
    if (this.busy) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    if (!this.captcha.resolved()) {
      this.message = "Completa la verificación antes de continuar.";
      return;
    }
    this.busy = "email";
    this.message = "";
    try {
      const { email, password } = this.form.getRawValue();
      await this.service.signIn({ email: email.trim(), password });
      await this.router.navigate(["/home"]);
    } catch (error) {
      this.message = authErrorMessage(error);
      this.captcha.init();
    } finally {
      this.busy = null;
    }
  }
}
