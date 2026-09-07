import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
  FormGroup
} from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../data-access/auth.service';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { CommonModule } from '@angular/common';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import Swal from 'sweetalert2';

interface ChangePasswordFormValue {
  email: string;
  password: string;
}

@Component({
  selector: 'app-change',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, CommonModule],
  templateUrl: './change.component.html',
  styleUrl: './change.component.css'
})
export class ChangeComponent {
  private firestore = getFirestore();
  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);
  private _auth = inject(AuthService).auth;

  constructor(private router: Router) {}

  form: FormGroup = this._formBuilder.group({
    email: this._formBuilder.control<string>('', [Validators.required, Validators.email]),
    password: this._formBuilder.control<string>('', [Validators.required, Validators.minLength(6)])
  });

  newPasswordControl = new FormControl<string>('', [Validators.required, Validators.minLength(6)]);
  confirmPasswordControl = new FormControl<string>('', [Validators.required]);

  async submit() {
    if (this.form.invalid || this.newPasswordControl.invalid || this.confirmPasswordControl.invalid) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor, completa todos los campos correctamente.',
        confirmButtonColor: '#ff6600'
      });
      return;
    }

    const { email, password } = this.form.value as ChangePasswordFormValue;
    const nuevaClave = this.newPasswordControl.value;
    const confirmarClave = this.confirmPasswordControl.value;

    const emailTrimmed = email?.trim() || '';
    if (!emailTrimmed || !password?.trim() || !nuevaClave || !confirmarClave) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Todos los campos son obligatorios.',
        confirmButtonColor: '#ff6600'
      });
      return;
    }

    if (nuevaClave.length < 6 || confirmarClave.length < 6) {
      Swal.fire({
        icon: 'warning',
        title: 'Contraseña muy corta',
        text: 'La nueva contraseña debe tener al menos 6 caracteres.',
        confirmButtonColor: '#ff6600'
      });
      return;
    }

    if (nuevaClave !== confirmarClave) {
      Swal.fire({
        icon: 'warning',
        title: 'Contraseñas no coinciden',
        text: 'Las nuevas contraseñas no coinciden.',
        confirmButtonColor: '#ff6600'
      });
      return;
    }

    try {
      const credentials = await signInWithEmailAndPassword(this._auth, emailTrimmed, password);
      await updatePassword(credentials.user, nuevaClave);

      const docSnap = await this._authService.buscarUsuarioDoc(emailTrimmed);
      if (docSnap) {
        await updateDoc(docSnap.ref, { intentos: 0 });
      }

      await Swal.fire({
        icon: 'success',
        title: '¡Contraseña actualizada!',
        text: 'Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con tu nueva clave.',
        confirmButtonColor: '#ff6600'
      });

      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Error al cambiar la contraseña:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al actualizar',
        text: 'No se pudo cambiar la contraseña. Verifica que tu correo y contraseña actual sean correctos.',
        confirmButtonColor: '#ff6600'
      });
      await this._authService.incrementarIntentosPorEmail(emailTrimmed);
    }

    this.form.reset();
    this.newPasswordControl.reset();
    this.confirmPasswordControl.reset();
  }

}
