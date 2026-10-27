import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PagoService } from '../../services/pago.service';
import {
  Pago, ResumenCuenta,
  ConceptoPago, MetodoPago
} from '../../models/pago.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-estado-cuenta',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './estado-cuenta.component.html',
  styleUrl: './estado-cuenta.component.css'
})
export class EstadoCuentaComponent implements OnInit {

  resumen!: ResumenCuenta;
  vistaActiva: 'cuenta' | 'historial' | 'registrar' = 'cuenta';
  filtroEstado: string = 'todos';

  // ── Formulario de nuevo pago ──────────────────────────────────────────
  nuevoConcepto: ConceptoPago = 'Mensualidad';
  nuevoMonto: number = 550;
  nuevoMetodo: MetodoPago = 'Efectivo';
  nuevoDescripcion: string = '';

  conceptos: ConceptoPago[] = [
    'Mensualidad', 'Inscripción', 'Suplementos',
    'Clase Especial', 'Renovación de Membresía', 'Locker', 'Toalla / Accesorio'
  ];
  metodos: MetodoPago[] = [
    'Efectivo', 'Tarjeta de débito', 'Tarjeta de crédito', 'Transferencia', 'QR / App'
  ];

  constructor(private pagoService: PagoService) {}

  ngOnInit(): void {
    this.pagoService.pagos$.subscribe(() => {
      this.resumen = this.pagoService.getResumen();
    });
  }

  // ── Helpers de template ───────────────────────────────────────────────
  get pagosFiltrados(): Pago[] {
    if (this.filtroEstado === 'todos') return this.resumen.pagos;
    return this.resumen.pagos.filter(
      p => p.estado.toLowerCase() === this.filtroEstado
    );
  }

  get porcentajePagado(): number {
    const total = this.resumen.totalPagado + this.resumen.totalPendiente;
    if (!total) return 0;
    return Math.round((this.resumen.totalPagado / total) * 100);
  }

  iconoMetodo(metodo: MetodoPago): string {
    const map: Record<MetodoPago, string> = {
      'Efectivo': 'bx-money',
      'Tarjeta de débito': 'bx-credit-card',
      'Tarjeta de crédito': 'bx-credit-card-alt',
      'Transferencia': 'bx-transfer',
      'QR / App': 'bx-qr-scan'
    };
    return map[metodo] ?? 'bx-payment';
  }

  iconoConcepto(concepto: ConceptoPago): string {
    const map: Record<ConceptoPago, string> = {
      'Mensualidad': 'bx-calendar-check',
      'Inscripción': 'bx-user-plus',
      'Suplementos': 'bx-capsule',
      'Clase Especial': 'bx-dumbbell',
      'Renovación de Membresía': 'bx-refresh',
      'Locker': 'bx-lock-open-alt',
      'Toalla / Accesorio': 'bx-store'
    };
    return map[concepto] ?? 'bx-receipt';
  }

  // ── Acciones ──────────────────────────────────────────────────────────
  registrarPago(): void {
    if (!this.nuevoMonto || this.nuevoMonto <= 0) {
      Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'Ingresa un monto mayor a $0.', confirmButtonColor: '#ff5722' });
      return;
    }

    Swal.fire({
      title: '¿Confirmar pago?',
      html: `
        <div style="text-align:left;font-size:.95rem">
          <p><strong>Concepto:</strong> ${this.nuevoConcepto}</p>
          <p><strong>Monto:</strong> $${this.nuevoMonto} MXN</p>
          <p><strong>Método:</strong> ${this.nuevoMetodo}</p>
          ${this.nuevoDescripcion ? `<p><strong>Nota:</strong> ${this.nuevoDescripcion}</p>` : ''}
        </div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ff5722',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        const pago = this.pagoService.registrarPago(
          this.nuevoConcepto, this.nuevoMonto, this.nuevoMetodo,
          this.nuevoDescripcion || undefined
        );
        this.nuevoDescripcion = '';
        this.nuevoMonto = 550;
        this.vistaActiva = 'historial';

        Swal.fire({
          icon: 'success',
          title: '¡Pago registrado!',
          html: `<p>Folio: <code>${pago.folio}</code></p><p>Guarda este folio como comprobante.</p>`,
          confirmButtonColor: '#ff5722'
        });
      }
    });
  }

  marcarComoPagado(pago: Pago): void {
    Swal.fire({
      title: 'Marcar como pagado',
      input: 'select',
      inputOptions: Object.fromEntries(this.metodos.map(m => [m, m])),
      inputPlaceholder: 'Selecciona método',
      showCancelButton: true,
      confirmButtonColor: '#ff5722',
      confirmButtonText: 'Confirmar pago',
      inputValidator: (value) => !value ? 'Selecciona un método de pago' : null
    }).then(res => {
      if (res.isConfirmed) {
        this.pagoService.marcarComoPagado(pago.id, res.value as MetodoPago);
        Swal.fire({ icon: 'success', title: 'Pago confirmado', confirmButtonColor: '#ff5722' });
      }
    });
  }

  cancelarPago(pago: Pago): void {
    Swal.fire({
      title: '¿Cancelar este pago pendiente?',
      text: `Folio ${pago.folio} – $${pago.monto} MXN`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver'
    }).then(res => {
      if (res.isConfirmed) {
        this.pagoService.cancelarPago(pago.id);
        Swal.fire({ icon: 'info', title: 'Pago cancelado', confirmButtonColor: '#ff5722' });
      }
    });
  }

  imprimirRecibo(pago: Pago): void {
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    ventana.document.write(`
      <html><head>
        <title>Recibo ${pago.folio}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width:600px; margin:40px auto; color:#222; }
          h1 { color:#ff5722; font-size:1.5rem; }
          table { width:100%; border-collapse:collapse; margin-top:16px; }
          td { padding:10px 12px; border-bottom:1px solid #eee; }
          td:first-child { font-weight:bold; color:#555; width:40%; }
          .badge { display:inline-block; padding:4px 12px; border-radius:20px;
                   background:#28a745; color:white; font-size:.85rem; }
          .footer { margin-top:32px; font-size:.8rem; color:#888; text-align:center; }
        </style>
      </head><body>
        <h1>🏋️ espacioGYM — Comprobante de Pago</h1>
        <table>
          <tr><td>Folio</td><td>${pago.folio}</td></tr>
          <tr><td>Fecha</td><td>${pago.fecha}</td></tr>
          <tr><td>Concepto</td><td>${pago.concepto}</td></tr>
          <tr><td>Periodo</td><td>${pago.periodo ?? '—'}</td></tr>
          <tr><td>Monto</td><td><strong>$${pago.monto} MXN</strong></td></tr>
          <tr><td>Método de Pago</td><td>${pago.metodo}</td></tr>
          <tr><td>Estado</td><td><span class="badge">${pago.estado}</span></td></tr>
          ${pago.descripcion ? `<tr><td>Notas</td><td>${pago.descripcion}</td></tr>` : ''}
        </table>
        <div class="footer">
          espacioGYM — Este documento es un comprobante de pago generado digitalmente.<br>
          Fecha de impresión: ${new Date().toLocaleString('es-MX')}
        </div>
        <script>window.print(); window.close();<\/script>
      </body></html>`);
    ventana.document.close();
  }
}
