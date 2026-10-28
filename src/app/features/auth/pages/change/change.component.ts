import { Component, inject } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { authErrorMessage } from "../../../../core/auth/auth-feedback";
import { PasswordToggleDirective } from "../../../../shared/directives/password-toggle.directive";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { SESSION } from "../../data-access/session.repository";
@Component({
  selector: "app-change",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PasswordToggleDirective,
    ButtonDirective,
  ],
  templateUrl: "./change.component.html",
  styleUrl: "./change.component.css",
})
export class ChangeComponent {
  private fb = inject(FormBuilder);
  private service = inject(SESSION);
  private router = inject(Router);
  busy = false;
  message = "";
  success = false;
  form = this.fb.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(6)]],
  });
  newPasswordControl = new FormControl("", {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(6)],
  });
  confirmPasswordControl = new FormControl("", {
    nonNullable: true,
    validators: Validators.required,
  });
  invalid(name: string) {
    const c = this.form.get(name);
    return !!(c?.invalid && c.touched);
  }
  async submit() {
    if (this.busy) return;
    this.form.markAllAsTouched();
    this.newPasswordControl.markAsTouched();
    this.confirmPasswordControl.markAsTouched();
    if (
      this.form.invalid ||
      this.newPasswordControl.invalid ||
      this.confirmPasswordControl.value !== this.newPasswordControl.value
    ) {
      this.message =
        "Revisa los campos y confirma que las nuevas contraseñas coincidan.";
      return;
    }
    this.busy = true;
    this.message = "";
    try {
      const { email, password } = this.form.getRawValue();
      await this.service.cambiarPassword(
        { email: email.trim(), password },
        this.newPasswordControl.value,
      );
      this.success = true;
      this.form.reset();
      this.newPasswordControl.reset();
      this.confirmPasswordControl.reset();
    } catch (error) {
      this.message = authErrorMessage(error);
      try {
        await this.service.incrementarIntentosPorEmail(
          this.form.controls.email.value.trim(),
        );
      } catch {
        /* The access error remains visible even if the attempt counter is unavailable. */
      }
    } finally {
      this.busy = false;
    }
  }
}
