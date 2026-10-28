import { InjectionToken, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  ConceptoPago,
  MetodoPago,
  Pago,
  ResumenCuenta,
} from "../models/pago.model";
import { PagoService } from "./pago.service";
export interface BillingRepository {
  pagos$: Observable<Pago[]>;
  registrarPago(
    concepto: ConceptoPago,
    monto: number,
    metodo: MetodoPago,
    descripcion?: string,
  ): Pago | Promise<Pago>;
  marcarComoPagado(id: string, metodo: MetodoPago): void | Promise<void>;
  cancelarPago(id: string): void | Promise<void>;
}
export const BILLING = new InjectionToken<BillingRepository>(
  "BillingRepository",
  { providedIn: "root", factory: () => inject(PagoService) },
);
