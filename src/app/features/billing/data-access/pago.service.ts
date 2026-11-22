import { DOCUMENT } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import { BehaviorSubject, firstValueFrom, Observable } from "rxjs";
import {
  APP_ENDPOINTS,
  backendBaseUrl,
} from "../../../core/config/app-endpoints";
import { localDate } from "../../../core/date/local-date";
import { BrowserStorage } from "../../../core/storage/browser-storage.service";
import { isList } from "../../../core/storage/storage-guards";
import { summarizePayments } from "../models/account-summary";
import {
  ConceptoPago,
  EstadoPago,
  MetodoPago,
  Pago,
  ResumenCuenta,
} from "../models/pago.model";
import { isPayment } from "../models/storage.guard";
import type { BillingRepository } from "./billing.repository";

interface BackendStripeTransaction {
  id?: string | number;
  folio?: string;
  payment_intent_id?: string;
  paymentIntentId?: string;
  user_email?: string;
  plan_nombre?: string;
  planNombre?: string;
  monto?: number;
  montoPagado?: number;
  descuento?: number;
  cupon?: string | null;
  moneda?: string;
  estado?: string;
  tipo?: string;
  type?: string;
  created_at?: string;
  fecha?: string;
}

@Injectable({ providedIn: "root" })
export class PagoService implements BillingRepository {
  private readonly storage = inject(BrowserStorage);
  private readonly http = inject(HttpClient, { optional: true });
  private readonly endpoints = inject(APP_ENDPOINTS, { optional: true });
  private readonly doc = inject(DOCUMENT, { optional: true });
  private readonly storageKey = "espacio_gym_pagos";
  private readonly syncedFromServer = signal(false);

  private readonly pagosSubject = new BehaviorSubject<Pago[]>(
    this.cargarPagosIniciales(),
  );
  public readonly pagos$: Observable<Pago[]> =
    this.pagosSubject.asObservable();

  constructor() {
    if (this.http && this.hasAuthToken()) {
      void this.refreshFromBackend();
    }
  }

  isSyncedFromServer(): boolean {
    return this.syncedFromServer();
  }

  getPagos(): Pago[] {
    return structuredClone(this.pagosSubject.value);
  }

  getResumen(): ResumenCuenta {
    return summarizePayments(this.getPagos());
  }

  async refreshFromBackend(email?: string): Promise<void> {
    if (!this.http) return;
    const base = backendBaseUrl(this.endpoints);
    const url = email
      ? `${base}/api/stripe/transactions?email=${encodeURIComponent(email)}`
      : `${base}/api/stripe/transactions`;

    try {
      const response = await firstValueFrom(
        this.http.get<
          | BackendStripeTransaction[]
          | { transactions?: BackendStripeTransaction[]; data?: BackendStripeTransaction[] }
        >(url),
      );
      const rows = Array.isArray(response)
        ? response
        : response?.transactions || response?.data || [];
      const mapped = rows.map((row, index) => this.mapBackendRow(row, index));
      this.syncedFromServer.set(true);
      this.guardar(mapped);
    } catch {
      this.syncedFromServer.set(false);
    }
  }

  registrarPago(
    concepto: ConceptoPago,
    monto: number,
    metodo: MetodoPago,
    descripcion?: string,
    customFolio?: string,
  ): Pago {
    const hoy = new Date();
    const nuevo: Pago = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      folio:
        customFolio || "GYM-" + Math.floor(100000 + Math.random() * 900000),
      concepto,
      monto,
      metodo,
      estado: "Pagado",
      fecha: localDate(hoy),
      periodo: hoy
        .toLocaleString("es-MX", { month: "long", year: "numeric" })
        .replace(/^\w/, (c) => c.toUpperCase()),
      descripcion,
    };

    const actualizados = [nuevo, ...this.pagosSubject.value];
    this.guardar(actualizados);
    return nuevo;
  }

  marcarComoPagado(id: string, metodo: MetodoPago): void {
    const actualizados = this.pagosSubject.value.map((p) =>
      p.id === id
        ? {
            ...p,
            estado: "Pagado" as const,
            metodo,
            fecha: localDate(new Date()),
          }
        : p,
    );
    this.guardar(actualizados);
  }

  cancelarPago(id: string): void {
    const actualizados = this.pagosSubject.value.map((p) =>
      p.id === id ? { ...p, estado: "Cancelado" as const } : p,
    );
    this.guardar(actualizados);
  }

  private guardar(pagos: Pago[]): void {
    this.storage.write(this.storageKey, pagos);
    this.pagosSubject.next(pagos);
  }

  private cargarPagosIniciales(): Pago[] {
    return this.storage.read(this.storageKey, isList(isPayment), () =>
      this.http ? [] : this.defaultPayments(),
    );
  }

  private hasAuthToken(): boolean {
    try {
      const storage = this.doc?.defaultView?.localStorage;
      return Boolean(storage?.getItem("gym_jwt") || storage?.getItem("gym_user"));
    } catch {
      return false;
    }
  }

  private mapBackendRow(row: BackendStripeTransaction, index: number): Pago {
    const idStr = String(
      row.id ?? row.payment_intent_id ?? row.paymentIntentId ?? `tx-${index}`,
    );
    const rawFolio = row.folio ? String(row.folio) : "";
    const folio = rawFolio.startsWith("STR-")
      ? rawFolio
      : idStr.startsWith("STR-")
        ? idStr
        : `STR-${idStr.replace(/\D/g, "").slice(-6).padStart(6, "0")}`;
    const planNombre = String(
      row.plan_nombre || row.planNombre || "Transacción Stripe",
    );
    const isProduct =
      (row.tipo || row.type) === "product" ||
      planNombre.toLowerCase().startsWith("productos");
    const concepto: ConceptoPago = isProduct ? "Suplementos" : "Mensualidad";
    const monto = Number(row.monto ?? row.montoPagado ?? 0);
    const rawFecha = String(row.created_at || row.fecha || "").slice(0, 10);
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(rawFecha)
      ? rawFecha
      : localDate(new Date());
    const rawState = String(row.estado || "").toLowerCase();
    const estado: EstadoPago =
      rawState === "cancelado" || rawState === "canceled"
        ? "Cancelado"
        : rawState === "pendiente" || rawState === "pending"
          ? "Pendiente"
          : "Pagado";
    const pi = row.payment_intent_id || row.paymentIntentId || "";
    const parts = [planNombre];
    if (row.cupon) parts.push(`Cupón: ${row.cupon}`);
    if (pi) parts.push(`Stripe ID: ${pi}`);

    return {
      id: idStr,
      folio,
      concepto,
      monto: Number.isFinite(monto) ? monto : 0,
      fecha,
      metodo: "Tarjeta de crédito",
      estado,
      descripcion: parts.join(" · "),
    };
  }

  private defaultPayments(): Pago[] {
    const base = new Date();
    const fecha = (mesesAtras: number): string => {
      const d = new Date(base);
      d.setMonth(d.getMonth() - mesesAtras);
      return localDate(d);
    };
    const periodo = (mesesAtras: number): string => {
      const d = new Date(base);
      d.setMonth(d.getMonth() - mesesAtras);
      return d
        .toLocaleString("es-MX", { month: "long", year: "numeric" })
        .replace(/^\w/, (c) => c.toUpperCase());
    };

    return [
      {
        id: "1",
        folio: "GYM-849201",
        concepto: "Inscripción",
        monto: 300,
        metodo: "Efectivo",
        estado: "Pagado",
        fecha: fecha(4),
        periodo: periodo(4),
        descripcion: "Pago de inscripción inicial + 1ª mensualidad",
      },
      {
        id: "2",
        folio: "GYM-849302",
        concepto: "Mensualidad",
        monto: 550,
        metodo: "Transferencia",
        estado: "Pagado",
        fecha: fecha(3),
        periodo: periodo(3),
      },
      {
        id: "3",
        folio: "GYM-849403",
        concepto: "Mensualidad",
        monto: 550,
        metodo: "Tarjeta de débito",
        estado: "Pagado",
        fecha: fecha(2),
        periodo: periodo(2),
      },
      {
        id: "4",
        folio: "GYM-849504",
        concepto: "Suplementos",
        monto: 380,
        metodo: "Efectivo",
        estado: "Pagado",
        fecha: fecha(2),
        periodo: periodo(2),
        descripcion: "Proteína Whey Gold Standard 2lb",
      },
      {
        id: "5",
        folio: "GYM-849605",
        concepto: "Mensualidad",
        monto: 550,
        metodo: "QR / App",
        estado: "Pagado",
        fecha: fecha(1),
        periodo: periodo(1),
      },
      {
        id: "6",
        folio: "GYM-849706",
        concepto: "Mensualidad",
        monto: 550,
        metodo: "Efectivo",
        estado: "Pendiente",
        fecha: fecha(0),
        periodo: periodo(0),
      },
    ];
  }
}
