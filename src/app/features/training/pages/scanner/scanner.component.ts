import { CommonModule } from "@angular/common";
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { QRCodeComponent } from "angularx-qrcode";
import { take } from "rxjs";
import {
  isAdminUser,
  isTestEnvironment,
  readGymUser,
  resolveReceptionOrAdminAccess,
} from "../../../../core/auth/route.guards";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import {
  QR_CODES,
  QrValidationResult,
  ReceptionSubscriberSummary,
} from "../../data-access/qr.repository";
import {
  decodeQrFromImageFile,
  decodeQrFromVideo,
  decodeQrPixels,
} from "../../data-access/qr.service";

@Component({
  selector: "app-scanner",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    QRCodeComponent,
    ButtonDirective,
    IconComponent,
  ],
  templateUrl: "./scanner.component.html",
  styleUrl: "./scanner.component.css",
})
export class ScannerComponent implements OnInit, OnDestroy {
  private readonly qr = inject(QR_CODES);
  private readonly route = inject(ActivatedRoute, { optional: true });

  @ViewChild("videoPreview") videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild("scanCanvas") canvasRef?: ElementRef<HTMLCanvasElement>;

  esRecepcionOAdmin = resolveReceptionOrAdminAccess();
  esAdmin = isAdminUser(readGymUser());
  activeTab: "qr" | "socios" | "validador" = "qr";

  subscribers: ReceptionSubscriberSummary[] = [];
  loadingSubscribers = false;
  subscriberSearch = "";
  subscriberFilter: "todos" | "Activa" | "Por vencer" | "Vencida" = "todos";

  manualToken = "";
  scanningCamera = false;
  validating = false;
  cameraError = "";
  lastResult: QrValidationResult | null = null;
  history: QrValidationResult[] = [];

  kioskToken = "";
  kioskExpiresAt = "";
  kioskOffline = false;
  kioskSecondsRemaining = 0;
  kioskLoading = false;
  kioskError = "";

  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private kioskTimerId: ReturnType<typeof setInterval> | null = null;
  private lastScannedCode = "";
  private lastScannedAt = 0;

  ngOnInit(): void {
    this.esRecepcionOAdmin = resolveReceptionOrAdminAccess();
    this.esAdmin = isAdminUser(readGymUser());
    this.route?.queryParams?.subscribe((params) => {
      const t = params?.["tab"];
      if (t === "socios" || t === "validador") {
        this.activeTab = t;
        if (t === "socios" && this.subscribers.length === 0) {
          this.loadSubscribers();
        }
      } else {
        this.activeTab = "qr";
      }
    });
    if (this.esRecepcionOAdmin && this.qr.issueKioskQr) {
      this.rotateKioskQr();
    }
    if (this.esRecepcionOAdmin) {
      this.loadSubscribers();
    }
  }

  setTab(tab: "qr" | "socios" | "validador"): void {
    this.activeTab = tab;
    if (tab === "socios" && this.subscribers.length === 0) {
      this.loadSubscribers();
    }
    if (tab !== "validador" && this.scanningCamera) {
      this.stopCamera();
    }
  }

  loadSubscribers(): void {
    if (!this.esRecepcionOAdmin) return;
    if (!this.qr.listSubscribers) {
      this.subscribers = [
        {
          id: "MEM-BLACK-ELITE-01",
          nombre: "Socio Black Elite",
          email: "socio@gymseminario.com",
          nombrePlan: "Black Elite",
          precio: 1200,
          periodo: "Trimestral",
          fechaInicio: "2026-11-22",
          fechaFin: "2027-02-20",
          diasRestantes: 90,
          estado: "Activa",
        },
      ];
      return;
    }
    this.loadingSubscribers = true;
    this.qr
      .listSubscribers()
      .pipe(take(1))
      .subscribe({
        next: (rows) => {
          this.loadingSubscribers = false;
          this.subscribers = rows;
        },
        error: () => {
          this.loadingSubscribers = false;
        },
      });
  }

  get filteredSubscribers(): ReceptionSubscriberSummary[] {
    const q = this.subscriberSearch.trim().toLowerCase();
    return this.subscribers.filter((s) => {
      const matchesFilter =
        this.subscriberFilter === "todos" || s.estado === this.subscriberFilter;
      if (!matchesFilter) return false;
      if (!q) return true;
      return (
        s.nombre.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.nombrePlan.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    });
  }

  get activeSubscribersCount(): number {
    return this.subscribers.filter((s) => s.estado === "Activa").length;
  }

  get eliteSubscribersCount(): number {
    return this.subscribers.filter(
      (s) =>
        s.estado !== "Vencida" &&
        (s.nombrePlan.toLowerCase().includes("black") ||
          s.nombrePlan.toLowerCase().includes("pro")),
    ).length;
  }

  get expiringSubscribersCount(): number {
    return this.subscribers.filter((s) => s.estado === "Por vencer").length;
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.stopKioskTimer();
  }

  rotateKioskQr(): void {
    if (!this.esRecepcionOAdmin || !this.qr.issueKioskQr || this.kioskLoading) {
      return;
    }
    this.stopKioskTimer();
    this.kioskLoading = true;
    this.kioskError = "";
    this.qr
      .issueKioskQr(30)
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          this.kioskLoading = false;
          this.kioskToken = result.token;
          this.kioskOffline = Boolean(result.offline);
          this.kioskExpiresAt = result.expiresAt || "";
          if (!this.kioskOffline && !isTestEnvironment()) {
            this.startKioskTimer(result.ttlSeconds || 30);
          }
        },
        error: () => {
          this.kioskLoading = false;
          this.kioskError =
            "No se pudo emitir el código QR rotativo de mostrador.";
        },
      });
  }

  private startKioskTimer(seconds: number): void {
    this.stopKioskTimer();
    this.kioskSecondsRemaining = Math.max(5, Math.round(seconds));
    this.kioskTimerId = setInterval(() => {
      if (this.kioskSecondsRemaining <= 1) {
        this.stopKioskTimer();
        this.rotateKioskQr();
      } else {
        this.kioskSecondsRemaining -= 1;
      }
    }, 1000);
  }

  private stopKioskTimer(): void {
    if (this.kioskTimerId !== null) {
      clearInterval(this.kioskTimerId);
      this.kioskTimerId = null;
    }
    this.kioskSecondsRemaining = 0;
  }

  async startCamera(): Promise<void> {
    if (!this.esRecepcionOAdmin || this.scanningCamera) return;
    this.cameraError = "";
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      this.cameraError =
        "Este navegador o dispositivo no permite acceso directo a la cámara. Puedes subir una captura o ingresar el código manualmente.";
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      this.scanningCamera = true;
      const video = this.videoRef?.nativeElement;
      if (video) {
        video.srcObject = this.stream;
        await video.play().catch(() => undefined);
      }
      this.scheduleNextFrame();
    } catch {
      this.stopCamera();
      this.cameraError =
        "No se pudo activar la cámara. Verifica permisos o utiliza la carga de imagen / entrada manual.";
    }
  }

  stopCamera(): void {
    if (this.rafId !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
    const video = this.videoRef?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
    this.scanningCamera = false;
  }

  private scheduleNextFrame(): void {
    if (!this.scanningCamera || typeof requestAnimationFrame !== "function") {
      return;
    }
    this.rafId = requestAnimationFrame(() => {
      this.captureVideoFrame();
      if (this.scanningCamera) {
        this.scheduleNextFrame();
      }
    });
  }

  private captureVideoFrame(): void {
    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!video || !canvas) return;
    const decoded = decodeQrFromVideo(video, canvas);
    if (!decoded) return;

    const now = Date.now();
    if (decoded === this.lastScannedCode && now - this.lastScannedAt < 3000) {
      return;
    }
    this.lastScannedCode = decoded;
    this.lastScannedAt = now;
    this.manualToken = decoded;
    this.validarToken(decoded);
  }

  decodePixels(
    data: Uint8ClampedArray,
    width: number,
    height: number,
  ): string | null {
    return decodeQrPixels(data, width, height);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    this.cameraError = "";

    try {
      const decoded = await decodeQrFromImageFile(
        file,
        this.canvasRef?.nativeElement,
      );
      if (!decoded) {
        this.lastResult = {
          valid: false,
          code: "QR_NO_DETECTADO",
          message:
            "No se detectó ningún código QR legible en la imagen seleccionada.",
        };
      } else {
        this.manualToken = decoded;
        this.validarToken(decoded);
      }
    } catch {
      this.cameraError = "No se pudo leer la imagen seleccionada.";
    } finally {
      if (input) input.value = "";
    }
  }

  validarManual(): void {
    this.validarToken(this.manualToken);
  }

  validarToken(token: string): void {
    if (!this.esRecepcionOAdmin || this.validating) return;
    const clean = token.trim();
    if (!clean) {
      this.lastResult = {
        valid: false,
        code: "QR_INVALIDO",
        message: "Ingresa o escanea un código QR antes de validar.",
      };
      return;
    }

    this.validating = true;
    const validator = this.qr.validateQr
      ? this.qr.validateQr(clean)
      : undefined;
    if (!validator) {
      this.validating = false;
      this.lastResult = {
        valid: false,
        code: "NO_DISPONIBLE",
        message: "El servicio de validación QR no está configurado.",
      };
      return;
    }

    validator.pipe(take(1)).subscribe({
      next: (result) => {
        this.validating = false;
        this.lastResult = result;
        this.history = [result, ...this.history].slice(0, 12);
      },
      error: () => {
        this.validating = false;
        this.lastResult = {
          valid: false,
          code: "ERROR_CONEXION",
          message: "No se pudo conectar con el servidor para validar el pase.",
        };
      },
    });
  }

  limpiarResultado(): void {
    this.lastResult = null;
    this.manualToken = "";
    this.cameraError = "";
  }
}
