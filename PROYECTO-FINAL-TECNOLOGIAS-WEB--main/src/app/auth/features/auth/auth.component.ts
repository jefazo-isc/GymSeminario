import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../data-access/auth.service';
import { Router } from '@angular/router';
import { getAuth, RecaptchaVerifier } from 'firebase/auth';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
  imports: [
    BrowserModule,
    ReactiveFormsModule  
  ],
})
export class AuthComponent implements OnInit {

  private _fb = inject(FormBuilder);
  private _authService = inject(AuthService);
  private router = inject(Router);
  private firebaseAuth = getAuth();

  // Toggle para mostrar login o registro
  isSignIn = true;

  // Formularios
  signInForm: FormGroup = this._fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  signUpForm: FormGroup = this._fb.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  captchaResuelto = false;
  recaptchaVerifier!: RecaptchaVerifier;

  ngOnInit() {
    this.initRecaptcha();
  }

  initRecaptcha() {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
    }
    this.recaptchaVerifier = new RecaptchaVerifier(
      this.firebaseAuth,
      'recaptcha-container',
      {
        size: 'normal',
        callback: (response: any) => {
          console.log('reCAPTCHA resuelto:', response);
          this.captchaResuelto = true;
        },
        'expired-callback': () => {
          console.warn('reCAPTCHA expirado');
          this.captchaResuelto = false;
        }
      }
    );
    this.recaptchaVerifier.render();
  }

  toggleForm() {
    this.isSignIn = !this.isSignIn;
    this.captchaResuelto = false;
    this.recaptchaVerifier.clear();
    this.initRecaptcha();
  }

  async onSignInSubmit() {
    if (this.signInForm.invalid) return;

    if (!this.captchaResuelto) {
      alert("Por favor, completa el reCAPTCHA.");
      return;
    }

    const { email, password } = this.signInForm.value;

    try {
      await this._authService.signIn({ email, password });
      this.router.navigate(['/home']);
    } catch (error) {
      console.error(error);
      alert('Error al iniciar sesión');
      this.recaptchaVerifier.clear();
      this.initRecaptcha();
      this.captchaResuelto = false;
    }
  }

  async onSignUpSubmit() {
    if (this.signUpForm.invalid) return;

    if (!this.captchaResuelto) {
      alert("Por favor, completa el reCAPTCHA.");
      return;
    }

    const { nombre, email, password } = this.signUpForm.value;

    try {
      await this._authService.signUp({ nombre, email, password });
      this.router.navigate(['/home']);
    } catch (error) {
      console.error(error);
      alert('Error al registrarse');
      this.recaptchaVerifier.clear();
      this.initRecaptcha();
      this.captchaResuelto = false;
    }
  }

  async conGoogle() {
    try {
      const result = await this._authService.signInWithGoogle();
      console.log('Usuario autenticado con Google:', result.user);
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Error en autenticación con Google:', error);
    }
  }

}
