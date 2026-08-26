import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { NgForm } from '@angular/forms';
import { Input } from '@angular/core';
import { Admin } from '../../admin';
import { ContraValidator } from '../../../validators/contra.validator';
import { matchContra } from '../../../validators/match-contra.validator';


@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './usuario.component.html',
  styleUrls: ['./usuario.component.css']
})
export class FormComponent implements OnInit {
  cuentaForm: FormGroup;
  mensaje: string = '';
  hoy: string = '';
  horaMin = '06:00';
  horaMax = '23:00';

  @Input() usuarioActual: string | null = null;
  
  clases: { valor: string, nombre: string }[] = [
  { valor: 'pesas', nombre: 'Indoor Cycling' },
  { valor: 'crosfit', nombre: 'Crosfit' },
  { valor: 'zumba', nombre: 'Zumba' }
];

  admins: Admin[] = [
    { usuario: 'abraham', contrasena: '123' },
    { usuario: 'pepe', contrasena: '123' },
    { usuario: 'luis', contrasena: '123' }
  ];
  
  checkboxValues = [false, false, false]; 
  sesionesSeleccionadas: number[] = [];   

actualizarSesiones() {
  this.sesionesSeleccionadas = [];
this.resumen.sesiones = 10; 
    this.resumen.sesiones = this.checkboxValues.filter(value => value).length;

  this.checkboxValues.forEach((valor, index) => {
    if (valor) {
      this.sesionesSeleccionadas.push(index + 1);
    }
  });

  if (this.sesionesSeleccionadas.length > 1) {
    Swal.fire({
      icon: 'warning',
      title: 'Máximo una sesión',
      text: 'Solo puedes seleccionar una sesión.',
      confirmButtonColor: '#d33'
    });

    this.checkboxValues = [false, false, false];
    this.sesionesSeleccionadas = []; 
  } else if (this.sesionesSeleccionadas.length === 1) {
    this.checkboxValues = [false, false, false]; 
    this.checkboxValues[this.sesionesSeleccionadas[0] - 1] = true; 
  }
  localStorage.setItem('sesionesSeleccionadas', JSON.stringify(this.sesionesSeleccionadas));
}


  @ViewChild('formTemplate') formTemplate!: NgForm;

  constructor(private fb: FormBuilder, private router: Router) {
  this.cuentaForm = this.fb.group({
  nombre: ['', Validators.required],
  usuario: ['', Validators.required],
  correo: ['', [Validators.required, Validators.email]],
  contrasena: ['', [Validators.required, ContraValidator]],
  confirmarContrasena: ['', Validators.required],
}, { validators: matchContra });

  const ultimaSesion = localStorage.getItem('ultimaSesion');
  if (ultimaSesion) {
    const datos = JSON.parse(ultimaSesion);
    this.resumen = datos; 

    this.formTemplate.setValue({
      nombre: datos.nombre,
      usuario: datos.usuario,
      hora: datos.hora,
      sesiones: datos.sesiones
    });

    this.resumenVisible = true;
  }
}

ngAfterViewInit() {
  const ultimaSesion = localStorage.getItem('ultimaSesion');
  if (ultimaSesion && this.formTemplate) {
    const datos = JSON.parse(ultimaSesion);
    this.resumen = datos;
    this.formTemplate.setValue({
      nombre: datos.nombre,
      usuario: datos.usuario,
      hora: datos.hora,
      sesiones: datos.sesiones
    });
    this.resumenVisible = true;
  }
}


  ngOnInit() {
        console.log('Usuario recibido:', this.usuarioActual);

  const hoy = new Date();
  this.hoy = hoy.toISOString().split('T')[0]; 
  this.usuarioActual = localStorage.getItem('usuarioActual');
  if (this.usuarioActual) {
    const savedSession = localStorage.getItem('formTemplateData');
    if (savedSession) {
      this.resumen = JSON.parse(savedSession);
      this.resumenVisible = true; 
    }
    
    const sesionesGuardadas = localStorage.getItem('sesionesSeleccionadas');
    if (sesionesGuardadas) {
      this.sesionesSeleccionadas = JSON.parse(sesionesGuardadas);
      this.checkboxValues = [false, false, false];
      this.sesionesSeleccionadas.forEach(sesion => {
        this.checkboxValues[sesion - 1] = true;
      });
    }
  }
}

actualizarHoraSegunDia(fecha: string) {
  const dia = new Date(fecha).getDay(); 

  if (dia === 6) {
    this.horaMax = '14:00';
  } else if (dia >= 1 && dia <= 5) {
    this.horaMax = '23:00';
  } else {
    this.horaMin = '';
    this.horaMax = '';
  }
}


validarDia(event: any) {
  const fecha = new Date(event.target.value);
  const dia = fecha.getDay();

  if (dia === 0) {
    this.mensaje = "El gimnasio no abre los domingos. Elige otro día.";
    event.target.value = '';
  } else {
    this.mensaje = '';
    this.actualizarHoraSegunDia(event.target.value);
  }
}



guardar() {
  if (this.cuentaForm.valid) {
    const { usuario, contrasena } = this.cuentaForm.value;

    const adminValido = this.admins.some(
      admin => admin.usuario === usuario && admin.contrasena === contrasena
    );

    if (adminValido) {
      localStorage.setItem('usuarioActual', usuario);
      this.usuarioActual = usuario;
      this.mostrarFormularioTemplate = true; 

      Swal.fire({
        icon: 'success',
        title: '¡Usuario registrado!',
        text: `Bienvenido ${usuario}`,
        confirmButtonColor: '#3085d6'
      });

      this.cuentaForm.reset();
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Usuario inválido',
        text: 'El usuario o contraseña no son correctos',
        confirmButtonColor: '#d33'
      });
    }
  } else {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Por favor llena todos los campos',
      confirmButtonColor: '#d33'
    });
  }
}

  
  guardarTemplate(form: NgForm) {
  if (form.valid) {
    const datosFormulario = {
      nombre: form.value.nombre,
      usuario: form.value.usuario,
      hora: form.value.hora,
      sesiones: form.value.sesiones
    };
    
    localStorage.setItem('ultimaSesion', JSON.stringify(datosFormulario)); 

    Swal.fire({
      icon: 'success',
      title: 'Formulario enviado (Template)',
      text: `Usuario: ${form.value.usuario}`,
      confirmButtonColor: '#3085d6'
    });

    form.reset(); 
  } else {
    Swal.fire({
      icon: 'warning',
      title: 'Formulario incompleto',
      text: 'Por favor, llena todos los campos del formulario por template.',
      confirmButtonColor: '#d33'
    });
  }
}

editarSesion() {
  if (this.resumen) {
    this.mostrarFormularioTemplate = true;
    setTimeout(() => {
      this.formTemplate.setValue({
        nombre: this.resumen.nombre,
        usuario: this.resumen.usuario,
        hora: this.resumen.hora,
        sesiones: this.resumen.sesiones
      });
    });
    Swal.fire({
      icon: 'info',
      title: 'Editar sesión',
      text: 'Puedes modificar los datos y volver a guardarlos.',
      confirmButtonColor: '#3085d6'
    });
  }
}

eliminarSesion() {
  Swal.fire({
    title: '¿Estás seguro?',
    text: 'Esta acción eliminará la sesión guardada.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#d33'
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem('ultimaSesion');
      localStorage.removeItem('sesionesSeleccionadas'); 

      this.resumen = {};
      this.resumenVisible = false;
      Swal.fire('Eliminado', 'La sesión ha sido eliminada.', 'success');
    }
  });
}

  cerrarSesion() {
    localStorage.removeItem('usuarioActual');
    localStorage.removeItem('formTemplateData');  
    this.usuarioActual = null;
    this.resumenVisible = false;
    

    Swal.fire({
      icon: 'info',
      title: 'Sesión cerrada',
      text: 'Has cerrado sesión correctamente.',
      confirmButtonColor: '#3085d6'
    });

    this.router.navigate(['titulo-container']);  
  }

  resumenVisible = false;
  resumen: any = {};

  mostrarResumen() {
    if (this.formTemplate.valid) {
      this.resumenVisible = !this.resumenVisible;
  
      if (this.resumenVisible) {
        this.resumen = {
          nombre: this.formTemplate.value.nombre,
          usuario: this.formTemplate.value.usuario,
          hora: this.formTemplate.value.hora,
          sesiones: this.formTemplate.value.sesiones
        };
      }
    } else {
      this.resumenVisible = false;
  
      // SweetAlert en lugar de alert()
      Swal.fire({
        title: 'Campos incompletos',
        text: 'Por favor completa todos los campos correctamente.',
        icon: 'warning',
        confirmButtonColor: '#ff6f00',
        background: '#fff',
        color: '#000'
      });
    }
  }

  mostrarFormularioTemplate: boolean = false;


  mostrarAlerta(mensaje: string) {
    let icono: 'success' | 'warning' | 'info' = 'info';
  
    if (mensaje.includes('correctamente')) {
      icono = 'success';
    } else if (mensaje.includes('Por favor')) {
      icono = 'warning';
    }
  
    Swal.fire({
      title: mensaje.includes('correctamente') ? '¡Éxito!' : 'Atención',
      text: mensaje,
      icon: icono,
      confirmButtonColor: '#ff6f00',
      background: '#000',
      color: '#fff'
    });
  }
  
}
