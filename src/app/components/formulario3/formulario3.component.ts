import { Component } from '@angular/core';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/data-access/auth.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { getAuth } from 'firebase/auth';
import Swal from 'sweetalert2';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { QrViewComponent } from '../qr-view/qr-view.component';


@Component({
  selector: 'app-formulario3',
  standalone: true,
  templateUrl: './formulario3.component.html',
  styleUrls: ['./formulario3.component.css'],
  imports: [FormsModule, CommonModule, HttpClientModule,QrViewComponent]
})
export class Formulario3Component {
  nuevo = {
    clase: '',
    fecha: '',
    hora: '',
    alumno: ''
  }; 

  clases = ['Cardio', 'Funcional', 'Spinning', 'Box', 'CrossFit'];
  userName: string | null = null;
  enviado:boolean; 
  loading = signal(false);

  clase:string="";
  fecha:string="";

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {
    this.authService.userName$.subscribe((name) => {
      this.userName = name;
    });
     this.enviado=false;
  }

  async guardar() {
  if (!this.userName) {
    Swal.fire('Error', 'No se pudo obtener el nombre del usuario.', 'error');
    return;
  }

  this.nuevo.alumno = this.userName;

  if (!this.nuevo.clase || !this.nuevo.fecha || !this.nuevo.hora) {
    Swal.fire('Campos incompletos', 'Por favor llena todos los campos.', 'warning');
    return;
  }
   this.loading.set(true);

   this.clase=this.nuevo.clase;
   this.fecha=this.nuevo.fecha;

  try {
    const colRef = collection(this.firestore, 'asistencias');
    await addDoc(colRef, this.nuevo);

    Swal.fire('Éxito', 'Asistencia guardada correctamente', 'success');

    // Obtener usuario autenticado
    const user = await this.authService.getCurrentUser();
    const email = user?.email || null;
    const telefono = user?.phoneNumber || null;

    const mensaje = `Gracias por registrar tu asistencia.
Clase: ${this.nuevo.clase}
Fecha: ${this.nuevo.fecha}
Hora: ${this.nuevo.hora}`;

    if (email) {
      this.enviarCorreo();
      
    } else if (telefono) {
      this.enviarSMS(telefono, mensaje);
    } else {
      console.warn('Usuario sin email ni teléfono para notificación.');
    }
     this.loading.set(false);

  } catch (error) {
    console.error('Error al guardar:', error);
    Swal.fire('Error', 'Error al guardar la asistencia', 'error');
     this.loading.set(false);
  }
}

cerrarPagina(){
   this.loading.set(false);
         this.enviado=true;
         setTimeout(() => {
           this.router.navigate(['/home']);
          this.enviado=false;
           this.nuevo = {
        clase: '',
        fecha: '',
        hora: '',
        alumno: ''
      };

      }, 10000);
}

enviarSMS(telefono: string, mensaje: string) {
   this.loading.set(true);
  // Aquí llamarías tu backend o Firebase Function que envía el SMS
  this.http.post('https://api2-gbbk.onrender.comenviar-sms', { telefono, mensaje })
    .subscribe({
      next: () =>  {Swal.fire('Éxito', 'Se envio SMS', 'success');
      this.cerrarPagina();
      },
      error: (err) => { Swal.fire('Error', 'No se envio SMS', 'error');
         this.loading.set(false);
          this.nuevo = {
        clase: '',
        fecha: '',
        hora: '',
        alumno: ''
      };
      }
    });
}

  async enviarCorreo() {
  const auth = getAuth();
  const user = auth.currentUser;
   this.loading.set(true);
  if (user && user.email) {
    const correoDestino = user.email;
    const nombre = user.displayName || this.userName || 'Usuario';

    console.log('Datos que se enviarán al backend:', {
  correo: correoDestino,
  nombre: nombre,
  clase: this.nuevo.clase,
  fecha: this.nuevo.fecha,
  hora: this.nuevo.hora
});
    this.http.post('https://api2-gbbk.onrender.com/enviar-asistencia', {
      correo: correoDestino,
      nombre: nombre,
      clase: this.nuevo.clase,
      fecha: this.nuevo.fecha,
      hora: this.nuevo.hora
    }).subscribe({
      next: () => {
        Swal.fire('Correo enviado', 'Se ha enviado el correo correctamente.', 'success');
         this.cerrarPagina();
      },
      error: () => {
        Swal.fire('Error', 'Error al enviar el correo.', 'error');
         this.loading.set(false);
          this.nuevo = {
        clase: '',
        fecha: '',
        hora: '',
        alumno: ''
      };
      }
    });
  } else {
    Swal.fire('Error', 'No hay usuario autenticado o el usuario no tiene un correo.', 'error');
  }
}


}
