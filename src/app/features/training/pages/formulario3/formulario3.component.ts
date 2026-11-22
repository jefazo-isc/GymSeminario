import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import {
  GymSessionUser,
  hasRoleSubscriptionBypass,
  isMembershipActive,
  isTestEnvironment,
  readGymUser,
} from "../../../../core/auth/route.guards";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { SESSION } from "../../../auth/data-access/session.repository";
import { MEMBERSHIPS } from "../../../memberships/data-access/membership.repository";
import { Membresia } from "../../../memberships/models/membresia.model";
import { TRAINING } from "../../data-access/training.repository";
import { QrViewComponent } from "../../ui/qr-view/qr-view.component";

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
  private training = inject(TRAINING);
  private auth = inject(SESSION);
  private memberships = inject(MEMBERSHIPS, { optional: true });
  private currentMembership: Membresia | null = null;
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
  tieneSuscripcion = false;
  private user: { email: string | null; phoneNumber: string | null; displayName: string | null } | null = null;
  constructor() {
    this.auth.userName$
      ?.pipe(takeUntilDestroyed())
      .subscribe((name) => (this.userName = name));
    this.memberships?.membresiaActual$
      ?.pipe(takeUntilDestroyed())
      .subscribe((mem) => {
        this.currentMembership = mem;
        this.tieneSuscripcion = this.hasSubscriptionAccess(readGymUser());
      });
  }
  ngOnInit() {
    const u = readGymUser();
    if (u && (u.email || u.uid)) {
      this.user = {
        email: u.email ?? null,
        phoneNumber: null,
        displayName: u.nombre ?? null,
      };
      this.authenticated = true;
      if (!this.userName && u.nombre) {
        this.userName = u.nombre;
      }
    } else {
      this.user = null;
      this.authenticated = false;
    }
    this.tieneSuscripcion = this.hasSubscriptionAccess(u);
    this.authReady = true;
  }
  private hasSubscriptionAccess(user: GymSessionUser | null): boolean {
    if (!user || (!user.email && !user.uid)) return false;
    if (hasRoleSubscriptionBypass(user)) return true;
    if (isTestEnvironment()) {
      return this.currentMembership?.id !== "MEM-INACTIVA";
    }
    return isMembershipActive(this.currentMembership);
  }
  async guardar() {
    if (this.loading() || this.enviado) return;
    this.error = "";
    if (!this.nuevo.clase || !this.nuevo.fecha || !this.nuevo.hora) {
      this.error = "Completa clase, fecha y hora.";
      return;
    }
    const u = readGymUser();
    if (!u || (!u.email && !u.uid)) {
      this.authenticated = false;
      this.tieneSuscripcion = false;
      this.error = "Inicia sesión para registrar una asistencia.";
      return;
    }
    this.authenticated = true;
    if (!this.hasSubscriptionAccess(u)) {
      this.tieneSuscripcion = false;
      this.error = "Necesitas una membresía activa para registrar una asistencia.";
      return;
    }
    this.tieneSuscripcion = true;
    const socioName = this.userName || u.nombre;
    if (!socioName) {
      this.error =
        "No se pudo obtener el nombre del socio. Revisa tu sesión antes de registrar la asistencia.";
      return;
    }
    this.nuevo.alumno = socioName;
    this.loading.set(true);
    try {
      this.user = { email: u.email ?? null, phoneNumber: null, displayName: u.nombre ?? null };
      const result = await this.training.createAttendance(this.nuevo);
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
      if (!this.user) throw new Error("Sesión no disponible.");
      const receipt = await this.training.notifyAttendance(
        this.user,
        this.nuevo,
        this.userName,
      );
      this.notification =
        receipt === "email"
          ? "Aviso por correo confirmado por el servicio."
          : receipt === "sms"
            ? "Aviso SMS confirmado por el servicio."
            : "Asistencia guardada. No hay un correo o teléfono para enviar un aviso.";
    } catch {
      this.notificationError = true;
      this.notification =
        "La asistencia está guardada, pero no se pudo confirmar el aviso. No registres la asistencia otra vez.";
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
    this.nuevo = { clase: "", fecha: "", hora: "", alumno: "" };
    this.enviado = false;
    this.recordId = "";
    this.error = "";
    this.notification = "";
  }
}
