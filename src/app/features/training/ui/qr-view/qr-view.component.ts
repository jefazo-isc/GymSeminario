import {
  Component,
  DestroyRef,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { QRCodeComponent } from "angularx-qrcode";
import { map } from "rxjs";
import { isTestEnvironment } from "../../../../core/auth/route.guards";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { SESSION } from "../../../auth/data-access/session.repository";
import { QR_CODES, QrIssueResult } from "../../data-access/qr.repository";

@Component({
  selector: "app-qr-view",
  standalone: true,
  imports: [QRCodeComponent, ButtonDirective],
  template: `@if (qrValue) {
      <div class="qr-paper">
        <qrcode
          [qrdata]="qrValue"
          [width]="256"
          [margin]="4"
          [errorCorrectionLevel]="'M'"
          [colorDark]="'#000000'"
          [colorLight]="'#ffffff'"
        />
      </div>
      <p class="help">
        Código de acceso generado para tu sesión. Preséntalo en recepción al
        llegar al gimnasio.
      </p>
      <p class="help">
        <span
          class="status"
          [class.status--success]="!isOfflineCode"
          [class.status--warning]="isOfflineCode"
        >
          {{
            isOfflineCode
              ? "Código offline (sin conexión al servidor)"
              : "Pase oficial emitido por el servidor"
          }}
        </span>
        @if (!isOfflineCode && secondsRemaining > 0) {
          <span> · Se actualiza en {{ secondsRemaining }}s</span>
        } @else if (expiresAt) {
          <span> · Vigente hasta {{ expiresAt }}</span>
        }
      </p>
      @if (!isOfflineCode && autoRotateSeconds > 0) {
        <button appButton="ghost" type="button" (click)="load()">
          Actualizar QR ahora
        </button>
      }
    } @else if (error) {
      <p class="notice notice--warning" role="alert">{{ error }}</p>
      <button appButton="secondary" type="button" (click)="load()">
        Reintentar código
      </button>
    } @else {
      <p class="help" role="status">Consultando el código de acceso…</p>
    }`,
  styles: [
    `
      :host {
        display: block;
      }
      .qr-paper {
        padding: 12px;
        border-radius: 8px;
        background: #fff;
        max-width: 280px;
        margin: 0 auto 16px;
        color: #000;
      }
      qrcode {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class QrViewComponent implements OnInit, OnDestroy {
  @Input() clase = "";
  @Input() fecha = "";
  @Input() bookingId = "";
  @Input() autoRotateSeconds = 30;
  qrValue: string | null = null;
  isOfflineCode = false;
  expiresAt = "";
  secondsRemaining = 0;
  error = "";
  private uid: string | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private qr = inject(QR_CODES);
  private auth = inject(SESSION);
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.auth.userUid$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((uid) => {
        this.uid = uid;
        this.qrValue = null;
        this.expiresAt = "";
        this.isOfflineCode = false;
        this.stopCountdown();
        if (uid) this.load();
        else this.error = "Necesitas una sesión para consultar el código.";
      });
  }

  ngOnDestroy() {
    this.stopCountdown();
  }

  load() {
    if (!this.uid) return;
    this.stopCountdown();
    this.error = "";
    this.qrValue = null;
    this.expiresAt = "";
    const uid = this.uid;
    const ttlSeconds =
      this.autoRotateSeconds > 0 ? this.autoRotateSeconds : undefined;
    const source$ = this.qr.issueQr
      ? this.qr.issueQr({
          uid,
          bookingId: this.bookingId || undefined,
          clase: this.clase || undefined,
          fecha: this.fecha || undefined,
          ttlSeconds,
        })
      : this.qr.getQrData(uid).pipe(
          map(
            (response): QrIssueResult => ({
              token: response?.data || "",
              offline: true,
            }),
          ),
        );

    source$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (uid !== this.uid) return;
        if (!response?.token) {
          this.error = "El servicio no devolvió un código válido.";
          return;
        }
        this.isOfflineCode = Boolean(response.offline);
        this.expiresAt = response.expiresAt || "";
        this.qrValue = response.offline
          ? `${response.token}-${this.clase}-${this.fecha}`
          : response.token;
        if (
          !this.isOfflineCode &&
          this.autoRotateSeconds > 0 &&
          !isTestEnvironment()
        ) {
          this.startCountdown(response.ttlSeconds || this.autoRotateSeconds);
        }
      },
      error: () => {
        if (uid === this.uid) {
          this.error =
            "El registro está guardado, pero no se pudo generar el código QR. Intenta de nuevo.";
        }
      },
    });
  }

  private startCountdown(seconds: number): void {
    this.stopCountdown();
    this.secondsRemaining = Math.max(5, Math.round(seconds));
    this.countdownTimer = setInterval(() => {
      if (this.secondsRemaining <= 1) {
        this.stopCountdown();
        this.load();
      } else {
        this.secondsRemaining -= 1;
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.secondsRemaining = 0;
  }
}
