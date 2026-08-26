import { Component, OnInit } from '@angular/core';
import { QRCodeComponent } from 'angularx-qrcode';
import { QrService } from '../../services/qr.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Input } from '@angular/core';
import { AuthService } from '../../auth/data-access/auth.service';

@Component({
  selector: 'app-qr-view',
  standalone: true,
  imports: [QRCodeComponent, CommonModule],
  template: `
    <div *ngIf="qrValue; else loading" class="qr-container">
      <qrcode [qrdata]="qrValue!" [width]="256" [errorCorrectionLevel]="'M'"></qrcode>
    </div>
    <ng-template #loading>
      <p>Cargando QR...</p>
    </ng-template>
  `,
  styles: [`
    :host {
      display: block;
      background-color: white;
      color: black;
      min-height: 100vh;
      padding: 16px;
    }

    .qr-container {
      background-color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      max-width: 300px;
      margin: 0 auto;
      color: black;
    }
  `]
})
export class QrViewComponent implements OnInit {

  @Input() clase!: string;
  @Input() fecha!: string;

  qrValue: string | null = null;
  private subscription = new Subscription();
  constructor(
    private qrService: QrService,
    private authService: AuthService 
  ) {}

  ngOnInit(): void {
    this.subscription = this.authService.userUid$.subscribe((uid) => {
       console.log('UID recibido en el componente:', uid)
      if (uid) {
        console.log('Usuario autenticado:', uid);
        this.qrService.getQrData(uid).subscribe({
          next: (response) => {
            console.log('Datos recibidos del API2:', response.data);
            this.qrValue = response.data+"-"+this.clase+"-"+this.fecha;
          },
          error: (err) => {
            console.error('Error obteniendo QR:', err);
          },
        });
      } else {
        console.log('No hay usuario autenticado.');
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe(); // importante limpiar subscripciones
  }
}
