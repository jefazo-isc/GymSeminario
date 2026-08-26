import { Component, inject } from '@angular/core';
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
import { signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { CommonModule } from '@angular/common';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
interface ChangePasswordFormValue {
  email: string;
  password: string;
}

@Component({
  selector: 'app-change',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule,CommonModule],
  templateUrl: './change.component.html',
  styleUrl: './change.component.css'
})
export class ChangeComponent {
  private  firestore = getFirestore();
  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);
  private _auth = inject(AuthService).auth; // asegúrate que tienes 'auth' expuesto en el servicio

  constructor(private router: Router) {}

  form: FormGroup = this._formBuilder.group({
    email: this._formBuilder.control<string>('', [Validators.required, Validators.email]),
    password: this._formBuilder.control<string>('', [Validators.required, Validators.minLength(6)])
  });

  newPasswordControl = new FormControl<string>('', [Validators.required, Validators.minLength(6)]);
  confirmPasswordControl = new FormControl<string>('', [Validators.required]);

  async submit() {
    if (this.form.invalid || this.newPasswordControl.invalid || this.confirmPasswordControl.invalid) {
      alert('Por favor, completa todos los campos correctamente.');
      return;
    }

    const { email, password } = this.form.value as ChangePasswordFormValue;
    const nuevaClave = this.newPasswordControl.value;
    const confirmarClave = this.confirmPasswordControl.value;

    if (!email.trim() || !password.trim() || !nuevaClave || !confirmarClave) {
      alert("Todos los campos son obligatorios.");
      return;
    }

    if (nuevaClave.length < 6 || confirmarClave.length < 6) {
      alert("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (nuevaClave !== confirmarClave) {
      alert("Las nuevas contraseñas no coinciden.");
      return;
    }

    try {
      const credentials = await signInWithEmailAndPassword(this._auth, email, password);
      await updatePassword(credentials.user, nuevaClave);
     // Obtener la referencia al documento del usuario (ajusta la ruta según tu BD)
      const usuarioDocRef = doc(this.firestore, "usuarios", credentials.user.uid);
  
  // Actualizar campo intentos a 0
      await updateDoc(usuarioDocRef, { intentos: 0 });
      alert('Contraseña cambiada exitosamente.');
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Error al cambiar la contraseña:', error);
      alert('No se pudo cambiar la contraseña. Verifica tus datos.');
      await this._authService.incrementarIntentosPorEmail(email);
    }

    this.form.reset();
    this.newPasswordControl.reset();
    this.confirmPasswordControl.reset();
  }

}
