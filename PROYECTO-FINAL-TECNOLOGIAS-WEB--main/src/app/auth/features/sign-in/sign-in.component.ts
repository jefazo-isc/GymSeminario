import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
  FormGroup
} from '@angular/forms';
import { AuthService } from '../../data-access/auth.service';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import {
  getAuth,
  RecaptchaVerifier
} from 'firebase/auth';

interface SignInFormValue {
  email: string;
  password: string;
}

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule,CommonModule],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.css'
})
export default class SignInComponent implements OnInit {

  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);
  private auth = getAuth();

  form: FormGroup = this._formBuilder.group({
    email: this._formBuilder.control<string>('', [Validators.required, Validators.email]),
    password: this._formBuilder.control<string>('', Validators.required)
  });

  captchaResuelto: boolean = false;
  recaptchaVerifier!: RecaptchaVerifier;

  constructor(private router: Router) {}

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

  const { email, password } = this.form.value as SignInFormValue;
  if (!email.trim() || !password.trim()) {
    alert("Por favor, completa todos los campos.");
    return;
  }

  if (!this.captchaResuelto) {
    alert("Por favor, completa el reCAPTCHA.");
    return;
  }

  try {
    await this._authService.signIn({ email, password });
    this.router.navigate(['/home']);
  } catch (error) {
    console.error(error);
    //alert("Credenciales incorrectas o error en autenticación.");
    
    // Intenta reiniciar el reCAPTCHA si el login falla
    this.recaptchaVerifier.clear();
    this.initRecaptcha(); // vuelve a mostrarlo
    this.captchaResuelto = false;

    await this._authService.incrementarIntentosPorEmail(email);
  }

  this.form.reset();
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
