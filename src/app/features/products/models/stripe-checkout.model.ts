export type CheckoutStatus =
  | "idle"
  | "ready"
  | "pending"
  | "complete"
  | "error";

export interface CouponEvaluation {
  codigo: string;
  porcentaje: number;
  descripcion: string;
  descuento: number;
  precioFinal: number;
}

export interface StripeProductCheckoutInput {
  holderName?: string;
}

export interface ProductCheckoutReceipt {
  folio: string;
  paymentIntentId: string;
  totalOriginal: number;
  descuento: number;
  totalPagado: number;
  cupon?: string;
  itemsSummary: string;
}
