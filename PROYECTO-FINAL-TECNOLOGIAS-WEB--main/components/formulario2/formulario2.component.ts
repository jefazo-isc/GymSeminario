import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { AuthService } from '../../auth/data-access/auth.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { getAuth } from 'firebase/auth';
import { getFirestore,query, where, getDocs } from "firebase/firestore";

import Swal from 'sweetalert2';


@Component({
  selector: 'app-formulario2',
  templateUrl: './formulario2.component.html',
  styleUrl: '/formulario2.component.css',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class Formulario2Component {
  formulario: FormGroup;
  entrenamientos: string[] = ['Boxeo', 'Crossfit', 'Spinning', 'Yoga', 'Pesas'];
  minFecha: string = new Date().toISOString().split('T')[0]; // para input type="date"

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private authService: AuthService,
    private http: HttpClient
  ) {
    this.formulario = this.fb.group({
      entrenamiento: ['', Validators.required],
      fecha: ['', Validators.required],
      turno: ['', Validators.required]
    });
  }

async enviarFormulario() {
  if (this.formulario.invalid) {
    this.formulario.markAllAsTouched();

    Swal.fire({
      icon: 'error',
      title: 'Formulario incompleto',
      text: 'Por favor, llena todos los campos requeridos.',
    });
    return;
  }

  const { entrenamiento, fecha, turno } = this.formulario.value;

  const hoy = new Date();
  const fechaSeleccionada = new Date(fecha);
  hoy.setHours(0, 0, 0, 0);
  fechaSeleccionada.setHours(0, 0, 0, 0);

  if (fechaSeleccionada < hoy) {
    Swal.fire({
      icon: 'error',
      title: 'Fecha inválida',
      text: 'La fecha no puede ser menor a la actual.',
    });
    return;
  }

  try {
    const user = await this.authService.getCurrentUser();
    console.log("USUARIO RARO");
    console.log(user);
    const uid = user?.uid;

    if (!uid) throw new Error('Usuario no autenticado');

    const email = user?.email || null;
    const telefono = user?.phoneNumber || null;

    const docRef = await addDoc(collection(this.firestore, 'formularioEntrenamiento'), {
      entrenamiento,
      fecha,
      turno,
      usuario: uid,
      email,
      telefono,
      nombre:user.displayName
    });

    console.log('Guardado con ID: ', docRef.id);

    Swal.fire({
      icon: 'success',
      title: 'Formulario enviado',
      text: 'Tus datos se han guardado correctamente.',
    });

    // Decide si enviar correo o SMS
    if (email) {
      this.enviarCorreo();
    } else if (telefono) {
      this.enviarSMS(telefono);
    } else {
      console.warn('No se puede enviar notificación: usuario sin email ni teléfono.');
    }

  } catch (error) {
    console.error('Error al enviar:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo guardar el formulario.',
    });
  }
}

enviarSMS(telefono: string) {
  const { entrenamiento, fecha, turno } = this.formulario.value;
  const mensaje = `Gracias por enviar tu formulario.
Entrenamiento: ${entrenamiento}
Fecha: ${fecha}
Turno: ${turno}
¡Nos vemos pronto!`;
  this.formulario.reset();

  this.http.post('http://localhost:3000/enviar-sms', {
    telefono,
    mensaje
  }).subscribe({
    next: (res: any) => {
      Swal.fire('SMS enviado', 'Se ha enviado el sms correctamente.', 'success');
    },
    error: (err) => {
      Swal.fire('No se pudo enviar el SMS', 'Intenta más tarde', 'error');
    }
  });
}


async enviarCorreo() {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user || !user.email) {
    alert('No hay usuario autenticado o el usuario no tiene un correo.');
    return;
  }

  const correoDestino = user.email;
  let nombre = user.displayName || '';

  if (!nombre) {
    console.log("Buscando nombre en Firestore...");
    const firestore = getFirestore();
    const usuariosRef = collection(firestore, 'usuarios');
    const q = query(usuariosRef, where('email', '==', correoDestino));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      nombre = userData['nombre'] || 'Usuario';
    } else {
      nombre = 'Usuario';
    }
  }

  const { entrenamiento, fecha, turno } = this.formulario.value;
  console.log("📤 Enviando al backend:", {
  correo: correoDestino,
  nombre: nombre,
  entrenamiento,
  fecha,
  turno
});
 this.formulario.reset();

  this.http.post('http://localhost:3000/enviar-correo', {
    correo: correoDestino,
    nombre: nombre,
    entrenamiento,
    fecha,
    turno
  }).subscribe({
    next: () => Swal.fire('Correo enviado', 'Se ha enviado el correo correctamente.', 'success'),
    error: () => Swal.fire('No se pudo enviar el correo', 'Intenta más tarde', 'error')
  });
}



}
