import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { RouterLink } from "@angular/router";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { SESSION } from "../../../auth/data-access/session.repository";
import { TRAINING } from "../../data-access/training.repository";
import { QrViewComponent } from "../../ui/qr-view/qr-view.component";
@Component({
  selector: "app-formulario2",
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
  templateUrl: "./formulario2.component.html",
  styleUrl: "./formulario2.component.css",
})
export class Formulario2Component implements OnInit {
  private fb = inject(FormBuilder);
  private training = inject(TRAINING);
  private auth = inject(SESSION);
  formulario = this.fb.nonNullable.group({
    entrenamiento: ["", Validators.required],
    fecha: ["", Validators.required],
    turno: ["", Validators.required],
  });
  entrenamientos = ["Boxeo", "Crossfit", "Spinning", "Yoga", "Pesas"];
  minFecha = this.localDate();
  loading = signal(false);
  enviado = false;
  clase = "";
  fecha = "";
  recordId = "";
  error = "";
  notification = "";
  notificationError = false;
  authReady = false;
  authenticated = false;
  private user: { email: string | null; phoneNumber: string | null; displayName: string | null } | null = null;
  ngOnInit() {
    this.minFecha = this.localDate();
    const u = this.safeGetUser();
    if (u) {
      this.user = { email: u.email ?? null, phoneNumber: null, displayName: u.nombre ?? null };
      this.authenticated = true;
    }
    this.authReady = true;
  }
  private safeGetUser(): any {
    const raw = localStorage.getItem("gym_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  private localDate() {
    const date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }
  invalid(name: string) {
    const control = this.formulario.get(name);
    return !!(control?.invalid && control.touched);
  }
  async enviarFormulario() {
    if (this.loading() || this.enviado) return;
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;
    this.error = "";
    const rawVal = this.formulario.getRawValue();
    const entrenamiento = rawVal.entrenamiento?.trim() ?? "";
    const fecha = rawVal.fecha?.trim() ?? "";
    const turno = rawVal.turno?.trim() ?? "";
    if (fecha < this.minFecha) {
      this.error = "Selecciona hoy o una fecha posterior.";
      return;
    }
    this.loading.set(true);
    try {
      const u = this.safeGetUser();
      if (!u?.email && !u?.uid) {
        this.error = "Inicia sesión antes de registrar un entrenamiento.";
        return;
      }
      this.user = { email: u.email ?? null, phoneNumber: null, displayName: u.nombre ?? null };
      const record = await this.training.createBooking({
        entrenamiento,
        fecha,
        turno,
        usuario: String(u.uid ?? ""),
        email: u.email || null,
        telefono: null,
        nombre: u.nombre ?? null,
      });
      this.recordId = record.id;
      this.clase = entrenamiento;
      this.fecha = new Date(fecha + "T00:00:00").toString();
      this.enviado = true;
      await this.notify();
    } catch {
      this.error =
        "No pudimos confirmar el registro en Firestore. Revisa tu conexión antes de volver a enviar.";
    } finally {
      this.loading.set(false);
    }
  }
  async notify() {
    this.notificationError = false;
    this.notification = "Enviando aviso…";
    const { entrenamiento, fecha, turno } = this.formulario.getRawValue();
    try {
      if (!this.user) throw new Error("Sesión no disponible.");
      const receipt = await this.training.notifyBooking(this.user, {
        entrenamiento,
        fecha,
        turno,
      });
      this.notification =
        receipt === "email"
          ? "Aviso por correo confirmado por el servicio."
          : receipt === "sms"
            ? "Aviso SMS confirmado por el servicio."
            : "Registro guardado. No hay un correo o teléfono para enviar un aviso.";
    } catch {
      this.notificationError = true;
      this.notification =
        "El registro está guardado, pero el servicio de avisos no respondió. No necesitas registrar de nuevo.";
    }
  }
  async retryNotification() {
    if (this.loading() || !this.enviado || !this.recordId) return;
    this.loading.set(true);
    try {
      await this.notify();
    } finally {
      this.loading.set(false);
    }
  }
  reset() {
    this.enviado = false;
    this.recordId = "";
    this.error = "";
    this.notification = "";
    this.minFecha = this.localDate();
    this.formulario.reset();
  }
}
