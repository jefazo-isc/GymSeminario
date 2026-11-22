import { CommonModule } from "@angular/common";
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { take } from "rxjs";
import {
  GymSessionUser,
  hasRoleSubscriptionBypass,
  isMembershipActive,
  isPureReceptionUser,
  isReceptionOrAdminUser,
  isTestEnvironment,
  readGymUser,
} from "../../../../core/auth/route.guards";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { SESSION } from "../../../auth/data-access/session.repository";
import { MEMBERSHIPS } from "../../../memberships/data-access/membership.repository";
import { Membresia } from "../../../memberships/models/membresia.model";
import {
  QR_CODES,
  QrValidationResult,
} from "../../data-access/qr.repository";
import {
  decodeQrFromImageFile,
  decodeQrFromVideo,
} from "../../data-access/qr.service";
import { TRAINING } from "../../data-access/training.repository";

@Component({
  selector: "app-formulario3",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonDirective,
    IconComponent,
  ],
  templateUrl: "./formulario3.component.html",
  styleUrl: "./formulario3.component.css",
})
export class Formulario3Component implements OnInit, OnDestroy {
  private training = inject(TRAINING);
  private auth = inject(SESSION);
  private memberships = inject(MEMBERSHIPS, { optional: true });
  private qr = inject(QR_CODES, { optional: true });
  private currentMembership: Membresia | null = null;

  @ViewChild("kioskVideo") kioskVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild("kioskCanvas") kioskCanvasRef?: ElementRef<HTMLCanvasElement>;

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
  esRecepcionOAdmin = false;

  kioskToken = "";
  kioskScanning = false;
  kioskBusy = false;
  kioskCameraError = "";
  kioskResult: QrValidationResult | null = null;

  private kioskStream: MediaStream | null = null;
  private kioskRafId: number | null = null;
  private user: {
    email: string | null;
    phoneNumber: string | null;
    displayName: string | null;
  } | null = null;

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
    this.esRecepcionOAdmin = isReceptionOrAdminUser(u);
    this.authReady = true;
  }

  ngOnDestroy() {
    this.stopKioskCamera();
  }

  private hasSubscriptionAccess(user: GymSessionUser | null): boolean {
    if (!user || (!user.email && !user.uid)) return false;
    if (isPureReceptionUser(user)) return false;
    if (hasRoleSubscriptionBypass(user)) return true;
    if (isTestEnvironment()) {
      return this.currentMembership?.id !== "MEM-INACTIVA";
    }
    return isMembershipActive(this.currentMembership);
  }

  async startKioskCamera(): Promise<void> {
    const u = readGymUser();
    if (!this.hasSubscriptionAccess(u) || this.kioskScanning) return;
    this.kioskCameraError = "";
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      this.kioskCameraError =
        "Este dispositivo no permite cámara directa; usa 'Tomar foto' o ingresa el código del mostrador.";
      return;
    }
    try {
      this.kioskStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      this.kioskScanning = true;
      const video = this.kioskVideoRef?.nativeElement;
      if (video) {
        video.srcObject = this.kioskStream;
        await video.play().catch(() => undefined);
      }
      this.scheduleKioskFrame();
    } catch {
      this.stopKioskCamera();
      this.kioskCameraError =
        "No se pudo abrir la cámara. Verifica permisos o usa 'Tomar foto / Subir imagen'.";
    }
  }

  stopKioskCamera(): void {
    if (
      this.kioskRafId !== null &&
      typeof cancelAnimationFrame === "function"
    ) {
      cancelAnimationFrame(this.kioskRafId);
      this.kioskRafId = null;
    }
    if (this.kioskStream) {
      for (const track of this.kioskStream.getTracks()) {
        track.stop();
      }
      this.kioskStream = null;
    }
    const video = this.kioskVideoRef?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
    this.kioskScanning = false;
  }

  private scheduleKioskFrame(): void {
    if (
      !this.kioskScanning ||
      typeof requestAnimationFrame !== "function"
    ) {
      return;
    }
    this.kioskRafId = requestAnimationFrame(() => {
      const video = this.kioskVideoRef?.nativeElement;
      const canvas = this.kioskCanvasRef?.nativeElement;
      if (video && canvas) {
        const decoded = decodeQrFromVideo(video, canvas);
        if (decoded) {
          this.stopKioskCamera();
          this.kioskToken = decoded;
          this.checkInWithKioskToken(decoded);
          return;
        }
      }
      if (this.kioskScanning) {
        this.scheduleKioskFrame();
      }
    });
  }

  async onKioskFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    this.kioskCameraError = "";

    try {
      const decoded = await decodeQrFromImageFile(
        file,
        this.kioskCanvasRef?.nativeElement,
      );
      if (!decoded) {
        this.kioskResult = {
          valid: false,
          code: "QR_NO_DETECTADO",
          message:
            "No se detectó un código QR legible en la fotografía. Intenta enfocar mejor el QR de mostrador.",
        };
      } else {
        this.kioskToken = decoded;
        this.checkInWithKioskToken(decoded);
      }
    } catch {
      this.kioskCameraError = "No se pudo procesar la fotografía del QR.";
    } finally {
      if (input) input.value = "";
    }
  }

  checkInWithKioskToken(tokenOverride?: string): void {
    if (this.kioskBusy) return;
    const u = readGymUser();
    if (!u || (!u.email && !u.uid)) {
      this.kioskResult = {
        valid: false,
        code: "NO_AUTORIZADO",
        message: "Inicia sesión para registrar tu asistencia con QR.",
      };
      return;
    }
    if (!this.hasSubscriptionAccess(u)) {
      this.tieneSuscripcion = false;
      this.kioskResult = {
        valid: false,
        code: "MEMBRESIA_VENCIDA",
        message:
          "Necesitas una suscripción activa para registrar asistencia con QR.",
      };
      return;
    }
    const cleanToken = (tokenOverride ?? this.kioskToken).trim();
    if (!cleanToken) {
      this.kioskResult = {
        valid: false,
        code: "QR_INVALIDO",
        message: "Escanea o escribe el código QR mostrado en recepción.",
      };
      return;
    }
    if (!this.qr?.kioskCheckin) {
      this.kioskResult = {
        valid: false,
        code: "OFFLINE",
        message: "El servicio de check-in QR no está disponible.",
      };
      return;
    }

    this.kioskBusy = true;
    const targetClase = this.nuevo.clase || "Acceso General";
    this.qr
      .kioskCheckin(cleanToken, targetClase)
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          this.kioskBusy = false;
          this.kioskResult = result;
        },
        error: () => {
          this.kioskBusy = false;
          this.kioskResult = {
            valid: false,
            code: "ERROR_CONEXION",
            message: "No se pudo validar el QR de mostrador en el servidor.",
          };
        },
      });
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
      this.error =
        "Necesitas una membresía activa para registrar una asistencia.";
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
      this.user = {
        email: u.email ?? null,
        phoneNumber: null,
        displayName: u.nombre ?? null,
      };
      const result = await this.training.createAttendance(this.nuevo);
      this.recordId = result.id;
      this.clase = this.nuevo.clase;
      this.fecha = this.nuevo.fecha;
      this.enviado = true;
      await this.notify();
    } catch {
      this.error =
        "No pudimos confirmar la asistencia en SQLite. Revisa tu conexión antes de volver a enviar.";
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
