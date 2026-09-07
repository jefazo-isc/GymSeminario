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
import Swal from 'sweetalert2';

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
  imports: [ReactiveFormsModule, RouterModule, CommonModule],
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
  recaptchaVerifier: RecaptchaVerifier | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.initRecaptcha();
  }

  initRecaptcha() {
    try {
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
      }
    } catch (e) {
      console.warn('Advertencia al limpiar reCAPTCHA previo:', e);
    } finally {
      this.recaptchaVerifier = null;
    }

    const container = document.getElementById('recaptcha-container');
    if (container) {
      container.innerHTML = '';
    }

    try {
      this.recaptchaVerifier = new RecaptchaVerifier(
        this.auth,
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
      }).catch((err) => {
        console.warn('Aviso renderizado reCAPTCHA:', err);
      });
    } catch (err) {
      console.error('Error al inicializar reCAPTCHA:', err);
    }
  }

  async submit() {
    if (this.form.invalid) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Por favor, ingresa un correo válido y tu contraseña.',
        confirmButtonColor: '#ff6600'
      });
      return;
    }

    const { email, password } = this.form.value as SignInFormValue;
    if (!email?.trim() || !password?.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor, completa todos los campos.',
        confirmButtonColor: '#ff6600'
      });
      return;
    }

    if (!this.captchaResuelto) {
      Swal.fire({
        icon: 'warning',
        title: 'Verificación requerida',
        text: 'Por favor, completa el reCAPTCHA antes de continuar.',
        confirmButtonColor: '#ff6600'
      });
      return;
    }

    try {
      await this._authService.signIn({ email: email.trim(), password });
      
      await Swal.fire({
        icon: 'success',
        title: '¡Bienvenido!',
        text: 'Inicio de sesión exitoso.',
        timer: 1500,
        showConfirmButton: false
      });

      this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('Error en autenticación:', error);

      const mensaje = error?.message || 'Correo o contraseña incorrectos.';
      Swal.fire({
        icon: 'error',
        title: 'Error de acceso',
        text: mensaje,
        confirmButtonColor: '#ff6600'
      });

      // Reiniciar reCAPTCHA de forma segura
      this.captchaResuelto = false;
      this.initRecaptcha();
    }
  }

  async conGoogle() {
    try {
      const result = await this._authService.signInWithGoogle();
      console.log('Usuario autenticado con Google:', result.user);
      
      await Swal.fire({
        icon: 'success',
        title: '¡Bienvenido!',
        text: `Hola, ${result.user.displayName || 'atleta'}`,
        timer: 1500,
        showConfirmButton: false
      });

      this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('Error en autenticación con Google:', error);
      if (error?.code !== 'auth/popup-closed-by-user') {
        Swal.fire({
          icon: 'error',
          title: 'Error con Google',
          text: 'No se pudo completar el inicio de sesión con Google.',
          confirmButtonColor: '#ff6600'
        });
      }
    }
  }
}
