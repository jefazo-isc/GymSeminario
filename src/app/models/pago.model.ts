export type ConceptoPago =
  | 'Mensualidad'
  | 'Inscripción'
  | 'Suplementos'
  | 'Clase Especial'
  | 'Renovación de Membresía'
  | 'Locker'
  | 'Toalla / Accesorio';

export type MetodoPago = 'Efectivo' | 'Tarjeta de débito' | 'Tarjeta de crédito' | 'Transferencia' | 'QR / App';

export type EstadoPago = 'Pagado' | 'Pendiente' | 'Cancelado';

export interface Pago {
  id: string;
  folio: string;
  concepto: ConceptoPago;
  monto: number;
  fecha: string;          // YYYY-MM-DD
  metodo: MetodoPago;
  estado: EstadoPago;
  descripcion?: string;
  periodo?: string;       // Ej: "Octubre 2026"
}

export interface ResumenCuenta {
  totalPagado: number;
  totalPendiente: number;
  ultimoPago: Pago | null;
  pagos: Pago[];
}
