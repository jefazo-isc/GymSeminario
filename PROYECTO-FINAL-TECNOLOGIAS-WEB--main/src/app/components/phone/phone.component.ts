import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  getAuth,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { WindowService } from '../../common/window.service';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { AuthService } from '../../auth/data-access/auth.service'; // Ajusta la ruta según tu estructura

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    confirmationResult: ConfirmationResult;
  }
}

interface Usuario {
  email: string;
  telefono?: string;
  // agrega aquí otros campos si tienes
}

@Component({
  selector: 'app-phone',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './phone.component.html',
  styleUrl: './phone.component.css'
})
export class PhoneComponent {
  phoneNumber: string = '';
  otp: string = '';
  windowRef: any;
  auth = getAuth();
  captchaResuelto: boolean = false;
  btnVerificar: boolean = false;
  usuarioLogueado: boolean = false;
  nombreUsuario: string | null = null;

  constructor(
    private windowService: WindowService,
    private authService: AuthService
  ) {
    this.windowRef = this.windowService.windowRef;
  }

  ngOnInit() {
    // Inicializar reCAPTCHA
    this.windowRef.recaptchaVerifier = new RecaptchaVerifier(
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
        }
      }
    );

    this.windowRef.recaptchaVerifier.render();

    // Escuchar cambios de sesión
    onAuthStateChanged(this.auth, (user: User | null) => {
      if (user) {
        console.log('Usuario logueado:', user.phoneNumber || user.uid);
        this.usuarioLogueado = true;
      } else {
        console.log('Usuario no está logueado');
        this.usuarioLogueado = false;
      }
    });

    // Escuchar el nombre del usuario desde AuthService
    this.authService.userName$.subscribe((nombre) => {
      this.nombreUsuario = nombre;
    });
  }

  enviarCodigo() {
    signInWithPhoneNumber(this.auth, this.phoneNumber, this.windowRef.recaptchaVerifier)
      .then((confirmationResult) => {
        window.confirmationResult = confirmationResult;
        console.log('Código enviado');
        this.captchaResuelto = false;
        this.btnVerificar = true;
      })
      .catch((error) => {
        console.error('Error al enviar código:', error);
        this.captchaResuelto = false;
        this.btnVerificar = true;
      });
  }

  async verificarCodigo() {
    try {
      const result = await window.confirmationResult.confirm(this.otp);
      console.log('Usuario autenticado:', result.user);

      // Buscar usuario en Firestore por teléfono
      await this.buscarUsuarioPorTelefono(this.phoneNumber);

      // Forzar carga del nombre y rol desde Firestore
      this.authService.loadUserRole(result.user.uid,this.phoneNumber);

    } catch (error) {
      console.error('Código inválido:', error);
    }
  }

  async buscarUsuarioPorTelefono(phone: string) {
    const db = getFirestore();
    const usuariosRef = collection(db, 'usuarios');
    const q = query(usuariosRef, where('telefono', '==', phone));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as Usuario;
      console.log('Usuario encontrado en Firestore:', userData);
    } else {
      console.log('No se encontró usuario con ese número de teléfono');
    }
  }

  esNumeroValido(): boolean {
    const regex = /^\+\d+$/;
    return regex.test(this.phoneNumber);
  }
}
