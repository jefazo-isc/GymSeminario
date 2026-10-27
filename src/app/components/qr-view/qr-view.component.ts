import { Component, Input, OnInit, inject, DestroyRef } from "@angular/core";
import { QRCodeComponent } from "angularx-qrcode";
import { QrService } from "../../services/qr.service";
import { AuthService } from "../../auth/data-access/auth.service";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ButtonDirective } from "../../shared/ui/button.directive";
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
        Código devuelto por el servicio externo. Su visualización no confirma
        acceso físico.
      </p>
    } @else if (error) {
      <p class="notice notice--warning" role="alert">{{ error }}</p>
      <button appButton="secondary" type="button" (click)="load()">
        Reintentar código
      </button>
    } @else {
      <p class="help" role="status">Consultando el código externo…</p>
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
export class QrViewComponent implements OnInit {
  @Input() clase = "";
  @Input() fecha = "";
  qrValue: string | null = null;
  error = "";
  private uid: string | null = null;
  private qr = inject(QrService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  ngOnInit() {
    this.auth.userUid$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((uid) => {
      this.uid = uid;
      this.qrValue = null;
      if (uid) this.load();
      else this.error = "Necesitas una sesión para consultar el código.";
    });
  }
  load() {
    if (!this.uid) return;
    this.error = "";
    this.qrValue = null;
    const uid = this.uid;
    this.qr
      .getQrData(uid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (uid !== this.uid) return;
          if (!response?.data) {
            this.error = "El servicio no devolvió un código válido.";
            return;
          }
          this.qrValue = response.data + "-" + this.clase + "-" + this.fecha;
        },
        error: () => {
          if (uid === this.uid)
            this.error =
              "El registro está guardado, pero el servicio de códigos no está disponible.";
        },
      });
  }
}
