import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { AuthService } from '../../data-access/auth.service';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import {
  getAuth,
  RecaptchaVerifier
} from 'firebase/auth';
import { NgIf } from '@angular/common';
import Swal from 'sweetalert2';
import { ContraValidator } from '../../../../validators/contra.validator';
import { matchContra } from '../../../../validators/match-contra.validator';

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
export default class SignUpComponent implements OnInit {

  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);
  private auth = getAuth();

  constructor(private router: Router) { }

  captchaResuelto: boolean = false;
  recaptchaVerifier: RecaptchaVerifier | null = null;

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
        title: 'Formulario incompleto',
        text: 'Por favor, revisa que todos los campos cumplan con los requisitos.',
        confirmButtonColor: '#ff6600'
      });
      return;
    }

    if (!this.captchaResuelto) {
      Swal.fire({
        icon: 'warning',
        title: 'Verificación requerida',
        text: 'Por favor, resuelve el reCAPTCHA antes de continuar.',
        confirmButtonColor: '#ff6600'
      });
      return;
    }

    try {
      const { email, password, nombre } = this.form.value as SignUpFormValue;

      if (!email?.trim() || !password?.trim() || !nombre?.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Campos incompletos',
          text: 'Por favor, completa todos los campos requeridos.',
          confirmButtonColor: '#ff6600'
        });
        return;
      }

      await this._authService.signUp({ email: email.trim(), password, nombre: nombre.trim() });
      
      await Swal.fire({
        icon: 'success',
        title: '¡Cuenta creada!',
        text: 'Tu cuenta ha sido creada exitosamente. Bienvenido a GROM.',
        timer: 1500,
        showConfirmButton: false
      });

      this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('Error al crear cuenta:', error);

      let mensaje = 'Ocurrió un error al registrar la cuenta.';
      if (error?.code === 'auth/email-already-in-use') {
        mensaje = 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
      } else if (error?.code === 'auth/weak-password') {
        mensaje = 'La contraseña es demasiado débil. Usa al menos 6 caracteres.';
      }

      Swal.fire({
        icon: 'error',
        title: 'Error de registro',
        text: mensaje,
        confirmButtonColor: '#ff6600'
      });

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
          text: 'No se pudo completar el registro con Google.',
          confirmButtonColor: '#ff6600'
        });
      }
    }
  }
}
