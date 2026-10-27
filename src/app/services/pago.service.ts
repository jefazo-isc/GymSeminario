import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Pago, ResumenCuenta, ConceptoPago, MetodoPago } from '../models/pago.model';

@Injectable({ providedIn: 'root' })
export class PagoService {
  private storageKey = 'espacio_gym_pagos';
  private pagosSubject = new BehaviorSubject<Pago[]>(this.cargarPagosIniciales());
  public pagos$: Observable<Pago[]> = this.pagosSubject.asObservable();

  constructor() {}

  // ── Obtener todos los pagos ──────────────────────────────────────────────
  getPagos(): Pago[] {
    return this.pagosSubject.value;
  }

  // ── Resumen de cuenta del cliente ────────────────────────────────────────
  getResumen(): ResumenCuenta {
    const pagos = this.getPagos();
    const pagados = pagos.filter(p => p.estado === 'Pagado');
    const pendientes = pagos.filter(p => p.estado === 'Pendiente');

    const ultimoPago = pagados.length
      ? [...pagados].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
      : null;

    return {
      totalPagado: pagados.reduce((acc, p) => acc + p.monto, 0),
      totalPendiente: pendientes.reduce((acc, p) => acc + p.monto, 0),
      ultimoPago,
      pagos
    };
  }

  // ── Registrar un nuevo pago ──────────────────────────────────────────────
  registrarPago(
    concepto: ConceptoPago,
    monto: number,
    metodo: MetodoPago,
    descripcion?: string
  ): Pago {
    const hoy = new Date();
    const nuevo: Pago = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      folio: 'GYM-' + Math.floor(100000 + Math.random() * 900000),
      concepto,
      monto,
      metodo,
      estado: 'Pagado',
      fecha: hoy.toISOString().split('T')[0],
      periodo: hoy.toLocaleString('es-MX', { month: 'long', year: 'numeric' })
               .replace(/^\w/, c => c.toUpperCase()),
      descripcion
    };

    const actualizados = [nuevo, ...this.pagosSubject.value];
    this.guardar(actualizados);
    return nuevo;
  }

  // ── Marcar pago pendiente como pagado ────────────────────────────────────
  marcarComoPagado(id: string, metodo: MetodoPago): void {
    const actualizados = this.pagosSubject.value.map(p =>
      p.id === id ? { ...p, estado: 'Pagado' as const, metodo, fecha: new Date().toISOString().split('T')[0] } : p
    );
    this.guardar(actualizados);
  }

  // ── Cancelar pago pendiente ──────────────────────────────────────────────
  cancelarPago(id: string): void {
    const actualizados = this.pagosSubject.value.map(p =>
      p.id === id ? { ...p, estado: 'Cancelado' as const } : p
    );
    this.guardar(actualizados);
  }

  // ── Persistencia ─────────────────────────────────────────────────────────
  private guardar(pagos: Pago[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(pagos));
    this.pagosSubject.next(pagos);
  }

  private cargarPagosIniciales(): Pago[] {
    const guardados = localStorage.getItem(this.storageKey);
    if (guardados) {
      try { return JSON.parse(guardados) as Pago[]; } catch { /* ignore */ }
    }

    // Historial de demostración
    const base = new Date();
    const fecha = (mesesAtras: number): string => {
      const d = new Date(base);
      d.setMonth(d.getMonth() - mesesAtras);
      return d.toISOString().split('T')[0];
    };
    const periodo = (mesesAtras: number): string => {
      const d = new Date(base);
      d.setMonth(d.getMonth() - mesesAtras);
      return d.toLocaleString('es-MX', { month: 'long', year: 'numeric' })
              .replace(/^\w/, c => c.toUpperCase());
    };

    return [
      {
        id: '1', folio: 'GYM-849201', concepto: 'Inscripción',
        monto: 300, metodo: 'Efectivo', estado: 'Pagado',
        fecha: fecha(4), periodo: periodo(4),
        descripcion: 'Pago de inscripción inicial + 1ª mensualidad'
      },
      {
        id: '2', folio: 'GYM-849302', concepto: 'Mensualidad',
        monto: 550, metodo: 'Transferencia', estado: 'Pagado',
        fecha: fecha(3), periodo: periodo(3)
      },
      {
        id: '3', folio: 'GYM-849403', concepto: 'Mensualidad',
        monto: 550, metodo: 'Tarjeta de débito', estado: 'Pagado',
        fecha: fecha(2), periodo: periodo(2)
      },
      {
        id: '4', folio: 'GYM-849504', concepto: 'Suplementos',
        monto: 380, metodo: 'Efectivo', estado: 'Pagado',
        fecha: fecha(2), periodo: periodo(2),
        descripcion: 'Proteína Whey Gold Standard 2lb'
      },
      {
        id: '5', folio: 'GYM-849605', concepto: 'Mensualidad',
        monto: 550, metodo: 'QR / App', estado: 'Pagado',
        fecha: fecha(1), periodo: periodo(1)
      },
      {
        id: '6', folio: 'GYM-849706', concepto: 'Mensualidad',
        monto: 550, metodo: 'Efectivo', estado: 'Pendiente',
        fecha: fecha(0), periodo: periodo(0)
      }
    ];
  }
}
