import { Component, inject, TemplateRef, DestroyRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, NgForm } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Dialog, DialogModule, DialogRef } from "@angular/cdk/dialog";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { PagoService } from "../../services/pago.service";
import {
  Pago,
  ResumenCuenta,
  ConceptoPago,
  MetodoPago,
} from "../../models/pago.model";
import { ButtonDirective } from "../../shared/ui/button.directive";
import { IconComponent } from "../../shared/ui/icon/icon.component";
import { escapeHtml } from "../../shared/ui/escape-html";
import Swal from "sweetalert2";
@Component({
  selector: "app-estado-cuenta",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonDirective,
    IconComponent,
  ],
  templateUrl: "./estado-cuenta.component.html",
  styleUrl: "./estado-cuenta.component.css",
})
export class EstadoCuentaComponent {
  private service = inject(PagoService);
  private dialog = inject(Dialog);
  private detail?: DialogRef;
  resumen!: ResumenCuenta;
  vistaActiva: "cuenta" | "historial" | "registrar" = "cuenta";
  filtroEstado = "todos";
  query = "";
  busy = false;
  feedback = "";
  selectedPayment: Pago | null = null;
  nuevoConcepto: ConceptoPago = "Mensualidad";
  nuevoMonto = 550;
  nuevoMetodo: MetodoPago = "Efectivo";
  nuevoDescripcion = "";
  conceptos: ConceptoPago[] = [
    "Mensualidad",
    "Inscripción",
    "Suplementos",
    "Clase Especial",
    "Renovación de Membresía",
    "Locker",
    "Toalla / Accesorio",
  ];
  metodos: MetodoPago[] = [
    "Efectivo",
    "Tarjeta de débito",
    "Tarjeta de crédito",
    "Transferencia",
    "QR / App",
  ];
  constructor() {
    this.service.pagos$
      .pipe(takeUntilDestroyed())
      .subscribe(() => (this.resumen = this.service.getResumen()));
    inject(DestroyRef).onDestroy(() => this.detail?.close());
  }
  get pagosFiltrados() {
    const q = this.query.toLowerCase().trim();
    return this.resumen.pagos.filter(
      (p) =>
        (this.filtroEstado === "todos" ||
          p.estado.toLowerCase() === this.filtroEstado) &&
        (!q ||
          (p.folio + " " + p.concepto + " " + (p.descripcion || ""))
            .toLowerCase()
            .includes(q)),
    );
  }
  get porcentajePagado() {
    const total = this.resumen.totalPagado + this.resumen.totalPendiente;
    return total ? Math.round((this.resumen.totalPagado / total) * 100) : 0;
  }
  openDetail(payment: Pago, template: TemplateRef<unknown>) {
    this.selectedPayment = payment;
    this.detail = this.dialog.open(template, {
      width: "560px",
      maxWidth: "calc(100vw - 24px)",
      panelClass: "grom-dialog",
      backdropClass: "grom-backdrop",
      ariaLabelledBy: "payment-detail-title",
      restoreFocus: true,
      autoFocus: ".payment-detail-close",
    });
  }
  closeDetail() {
    this.detail?.close();
  }
  async registrarPago(form?: NgForm) {
    if (this.busy) return;
    if (
      form?.invalid ||
      !Number.isFinite(this.nuevoMonto) ||
      this.nuevoMonto <= 0
    ) {
      form?.form.markAllAsTouched();
      this.feedback = "Ingresa un importe válido mayor a cero.";
      return;
    }
    this.busy = true;
    try {
      const result = await Swal.fire({
        title: "Revisar anotación local",
        html:
          "<p>Concepto: " +
          escapeHtml(this.nuevoConcepto) +
          "</p><p>Importe: <strong>$" +
          this.nuevoMonto.toLocaleString("es-MX", {
            minimumFractionDigits: 2,
          }) +
          " MXN</strong></p><p>Método anotado: " +
          escapeHtml(this.nuevoMetodo) +
          "</p><p>" +
          escapeHtml(this.nuevoDescripcion) +
          "</p><p>Esta anotación no mueve dinero ni confirma una transacción bancaria.</p>",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Guardar anotación",
        cancelButtonText: "Volver",
      });
      if (result.isConfirmed) {
        const pago = this.service.registrarPago(
          this.nuevoConcepto,
          this.nuevoMonto,
          this.nuevoMetodo,
          this.nuevoDescripcion || undefined,
        );
        this.feedback = "Anotación local guardada. Folio " + pago.folio + ".";
        this.nuevoDescripcion = "";
        this.nuevoMonto = 550;
        this.vistaActiva = "historial";
      }
    } catch {
      this.feedback =
        "No se pudo guardar en el navegador. No se realizó una transacción.";
    } finally {
      this.busy = false;
    }
  }
  async marcarComoPagado(payment: Pago) {
    if (this.busy) return;
    this.busy = true;
    try {
      const result = await Swal.fire({
        title: "Cambiar estado de la anotación",
        text: "Se marcará como pagada únicamente en este navegador. No se verifica un ingreso bancario.",
        input: "select",
        inputOptions: Object.fromEntries(this.metodos.map((m) => [m, m])),
        inputPlaceholder: "Selecciona el método anotado",
        inputValidator: (value) => (!value ? "Selecciona un método." : null),
        showCancelButton: true,
        confirmButtonText: "Actualizar ejemplo",
        cancelButtonText: "Volver",
      });
      if (result.isConfirmed) {
        this.service.marcarComoPagado(payment.id, result.value as MetodoPago);
        this.feedback = "Estado local actualizado.";
      }
    } catch {
      this.feedback = "No se pudo actualizar el estado local.";
    } finally {
      this.busy = false;
    }
  }
  async cancelarPago(payment: Pago) {
    if (this.busy) return;
    this.busy = true;
    try {
      const result = await Swal.fire({
        title: "Cancelar anotación pendiente",
        text:
          "Folio " +
          payment.folio +
          ". Este cambio solo afecta el registro local; no cancela cobros ni reservas remotas.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Cancelar anotación",
        cancelButtonText: "Conservar",
      });
      if (result.isConfirmed) {
        this.service.cancelarPago(payment.id);
        this.feedback = "Anotación local cancelada.";
      }
    } catch {
      this.feedback = "No se pudo actualizar el registro local.";
    } finally {
      this.busy = false;
    }
  }
  imprimirRecibo(payment: Pago) {
    const view = window.open("", "_blank");
    if (!view) {
      this.feedback =
        "El navegador bloqueó la ventana de impresión. Permite ventanas para este sitio.";
      return;
    }
    const esc = escapeHtml;
    view.document.write(
      '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Registro local ' +
        esc(payment.folio) +
        '</title><style>body{font:15px/1.6 Arial,sans-serif;color:#1f2937;max-width:650px;margin:40px auto;padding:0 20px}h1{font-size:26px;color:#375d67}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px 0;border-bottom:1px solid #ddd}th{width:40%;font-weight:500}.note{padding:16px;background:#eff2f3;margin:24px 0}.footer{font-size:12px;color:#5b6470}</style></head><body><h1>GROM 21 · Registro local</h1><p class="note">Demostración del navegador. No es un comprobante bancario ni fiscal y no acredita un cobro.</p><table><tr><th>Folio</th><td>' +
        esc(payment.folio) +
        "</td></tr><tr><th>Fecha</th><td>" +
        esc(payment.fecha) +
        "</td></tr><tr><th>Concepto</th><td>" +
        esc(payment.concepto) +
        "</td></tr><tr><th>Periodo</th><td>" +
        esc(payment.periodo || "—") +
        "</td></tr><tr><th>Importe</th><td>$" +
        payment.monto.toFixed(2) +
        " MXN</td></tr><tr><th>Método anotado</th><td>" +
        esc(payment.metodo) +
        "</td></tr><tr><th>Estado local</th><td>" +
        esc(payment.estado) +
        "</td></tr><tr><th>Notas</th><td>" +
        esc(payment.descripcion || "Sin notas") +
        '</td></tr></table><p class="footer">Impreso el ' +
        esc(new Date().toLocaleString("es-MX")) +
        "</p></body></html>",
    );
    view.document.close();
    view.focus();
    view.print();
  }
}
