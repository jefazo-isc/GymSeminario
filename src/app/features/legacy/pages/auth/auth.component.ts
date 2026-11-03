import { Component, inject } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { SESSION } from "../../../auth/data-access/session.repository";

@Component({
  selector: "app-auth",
  templateUrl: "./auth.component.html",
  styleUrls: ["./auth.component.css"],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class AuthComponent {
  private _fb = inject(FormBuilder);
  private _authService = inject(SESSION);
  private router = inject(Router);

  isSignIn = true;

  signInForm: FormGroup = this._fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", Validators.required],
  });

  signUpForm: FormGroup = this._fb.group({
    nombre: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
    password: ["", Validators.required],
  });

  captchaResuelto = true; // siempre resuelto (sin Firebase ReCAPTCHA)

  toggleForm() {
    this.isSignIn = !this.isSignIn;
  }

  async onSignInSubmit() {
    if (this.signInForm.invalid) return;
    const { email, password } = this.signInForm.value;
    try {
      await this._authService.signIn({ email, password });
      this.router.navigate(["/home"]);
    } catch (error) {
      console.error(error);
      alert("Correo o contraseña incorrectos.");
    }
  }

  async onSignUpSubmit() {
    if (this.signUpForm.invalid) return;
    const { nombre, email, password } = this.signUpForm.value;
    try {
      await this._authService.signUp({ nombre, email, password });
      this.router.navigate(["/home"]);
    } catch (error) {
      console.error(error);
      alert("Error al registrarse. El correo puede ya estar en uso.");
    }
  }

  async conGoogle() {
    alert("El acceso con Google no está disponible. Usa tu correo y contraseña.");
  }
}
