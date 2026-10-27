import { Component, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Firestore, collection, addDoc } from "@angular/fire/firestore";
import { getFirestore, query, where, getDocs } from "firebase/firestore";
import { HttpClient } from "@angular/common/http";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { AuthService } from "../../auth/data-access/auth.service";
import { QrViewComponent } from "../qr-view/qr-view.component";
import { ButtonDirective } from "../../shared/ui/button.directive";
import { IconComponent } from "../../shared/ui/icon/icon.component";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
@Component({
  selector: "app-formulario3",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    QrViewComponent,
    ButtonDirective,
    IconComponent,
  ],
  templateUrl: "./formulario3.component.html",
  styleUrl: "./formulario3.component.css",
})
export class Formulario3Component implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  nuevo = { clase: "", fecha: "", hora: "", alumno: "" };
  clases = ["Cardio", "Funcional", "Spinning", "Box", "CrossFit"];
  userName: string | null = null;
  enviado = false;
  loading = signal(false);
  clase = "";
  fecha = "";
  recordId = "";
  error = "";
  notification = "";
  notificationError = false;
  authReady = false;
  authenticated = false;
  private user: any;
  constructor() {
    this.auth.userName$
      .pipe(takeUntilDestroyed())
      .subscribe((name) => (this.userName = name));
  }
  ngOnInit() {
    this.auth
      .getCurrentUser()
      .then((user) => {
        this.user = user;
        this.authenticated = !!user;
        this.authReady = true;
      })
      .catch(() => {
        this.authReady = true;
        this.error = "No se pudo consultar la sesión de Firebase.";
      });
  }
  async guardar() {
    if (this.loading() || this.enviado) return;
    this.error = "";
    if (!this.nuevo.clase || !this.nuevo.fecha || !this.nuevo.hora) {
      this.error = "Completa clase, fecha y hora.";
      return;
    }
    if (!this.userName) {
      this.error =
        "No se pudo obtener el nombre del socio. Revisa tu sesión antes de registrar la asistencia.";
      return;
    }
    this.nuevo.alumno = this.userName;
    this.loading.set(true);
    try {
      const user = await this.auth.getCurrentUser();
      if (!user) {
        this.error = "Inicia sesión para registrar una asistencia.";
        return;
      }
      this.user = user;
      const result = await addDoc(
        collection(this.firestore, "asistencias"),
        this.nuevo,
      );
      this.recordId = result.id;
      this.clase = this.nuevo.clase;
      this.fecha = this.nuevo.fecha;
      this.enviado = true;
      await this.notify();
    } catch {
      this.error =
        "No pudimos confirmar la asistencia en Firestore. Revisa tu conexión antes de volver a enviar.";
    } finally {
      this.loading.set(false);
    }
  }
  async notify() {
    this.notificationError = false;
    this.notification = "Enviando aviso…";
    try {
      if (this.user?.email) {
        await firstValueFrom(
          this.http.post(
            "https://gymseminario.onrender.com/enviar-asistencia",
            {
              correo: this.user.email,
              nombre: this.user.displayName || this.userName || "Usuario",
              clase: this.nuevo.clase,
              fecha: this.nuevo.fecha,
              hora: this.nuevo.hora,
            },
          ),
        );
        this.notification = "Aviso por correo confirmado por el servicio.";
      } else if (this.user?.phoneNumber) {
        const mensaje =
          "Gracias por registrar tu asistencia.\nClase: " +
          this.nuevo.clase +
          "\nFecha: " +
          this.nuevo.fecha +
          "\nHora: " +
          this.nuevo.hora;
        await firstValueFrom(
          this.http.post("https://gymseminario.onrender.com/enviar-sms", {
            telefono: this.user.phoneNumber,
            mensaje,
          }),
        );
        this.notification = "Aviso SMS confirmado por el servicio.";
      } else
        this.notification =
          "Asistencia guardada. No hay un correo o teléfono para enviar un aviso.";
    } catch {
      this.notificationError = true;
      this.notification =
        "La asistencia está guardada, pero no se pudo confirmar el aviso. No registres la asistencia otra vez.";
    }
  }
  async retryNotification() {
    if (this.loading()) return;
    this.loading.set(true);
    try {
      await this.notify();
    } finally {
      this.loading.set(false);
    }
  }
  reset() {
    this.nuevo = { clase: "", fecha: "", hora: "", alumno: "" };
    this.enviado = false;
    this.recordId = "";
    this.error = "";
    this.notification = "";
  }
}
