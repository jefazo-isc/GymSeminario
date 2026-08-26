import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { AuthService } from '../../data-access/auth.service';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import {
  getAuth,
  RecaptchaVerifier
} from 'firebase/auth';
import { NgIf } from '@angular/common';
import { ContraValidator } from '../../../../validators/contra.validator';
import { matchContra } from '../../../../validators/match-contra.validator';
// Interfaz para los datos del formulario (solo los valores, no los FormControls)
interface SignUpFormValue {
  email: string;
  password: string;
  nombre: string;
}


@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, NgIf],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.css'
})
export default class SignUpComponent {

  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);
  private auth = getAuth();

  constructor(private router: Router) { }

  captchaResuelto: boolean = false;
  recaptchaVerifier!: RecaptchaVerifier;

  // Tipamos el FormGroup con los tipos correctos
  form: FormGroup = this._formBuilder.group(
    {
      email: this._formBuilder.control<string>('', [Validators.required, Validators.email]),
      nombre: this._formBuilder.control<string>('', [Validators.required]),
      password: this._formBuilder.control<string>('', [Validators.required, ContraValidator]),
      confirmPassword: this._formBuilder.control<string>('', [Validators.required]),
    },
    {
      validators: matchContra('password', 'confirmPassword'),
    }
  );
  ngOnInit(): void {
    this.initRecaptcha();
  }

  initRecaptcha() {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
    }

    this.recaptchaVerifier = new RecaptchaVerifier(
      this.auth, // ✅ auth primero
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

    this.recaptchaVerifier.render().then((widgetId) => {
      console.log('reCAPTCHA renderizado con ID:', widgetId);
    });
  }


  async submit() {
    if (this.form.invalid) return;

    // ✅ Validación de captcha
    if (!this.captchaResuelto) {
      alert('Por favor, resuelve el reCAPTCHA antes de continuar.');
      return;
    }

    try {
      const { email, password, nombre } = this.form.value as SignUpFormValue;

      if (!email || !password || !nombre) return;

      if (!email.trim() || !password.trim() || !nombre.trim()) {
        alert("Por favor, completa todos los campos.");
        return;
      }

      await this._authService.signUp({ email, password, nombre });
      this.router.navigate(['/home']);
    } catch (error) {
      alert("error");
      console.log(error);
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
