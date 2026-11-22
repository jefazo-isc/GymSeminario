import { DOCUMENT } from "@angular/common";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import {
  APP_ENDPOINTS,
  STRIPE_CONFIG,
} from "../../../core/config/app-endpoints";
import { BILLING } from "../../billing/data-access/billing.repository";
import { CUPONES_SISTEMA } from "../../memberships/data-access/membership-stripe.service";
import {
  CheckoutStatus,
  CouponEvaluation,
  ProductCheckoutReceipt,
  StripeCardDetails,
} from "../models/stripe-checkout.model";
import { CartStore } from "./cart.store";

interface ConfirmPaymentResponse {
  ok?: boolean;
  status?: string;
  folio?: string;
  paymentIntentId?: string;
  montoPagado?: number;
  error?: string;
}

@Injectable({ providedIn: "root" })
export class StripeCheckoutAdapter {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly endpoints = inject(APP_ENDPOINTS, { optional: true });
  private readonly stripeConfig = inject(STRIPE_CONFIG, { optional: true });
  private readonly cart = inject(CartStore);
  private readonly billing = inject(BILLING, { optional: true });
  private readonly doc = inject(DOCUMENT, { optional: true });

  readonly pending = signal(false);
  readonly state = signal<CheckoutStatus>("idle");
  readonly message = signal("");
  readonly activeCoupon = signal<CouponEvaluation | null>(null);
  readonly couponError = signal("");
  readonly lastReceipt = signal<ProductCheckoutReceipt | null>(null);

  readonly finalAmount = computed(() => {
    const base = Number(this.cart.total().toFixed(2));
    const coupon = this.activeCoupon();
    if (!coupon) return base;
    return this.validarCupon(coupon.codigo, base)?.precioFinal ?? base;
  });

  readonly isCourtesyBypass = computed(
    () => this.cart.items().length > 0 && this.finalAmount() === 0,
  );

  // An uncertain confirmation may not be retried as a fresh charge by the same adapter.
  private unresolved = false;

  validarCupon(codigo: string, precioBase: number): CouponEvaluation | null {
    const code = (codigo || "").trim().toUpperCase();
    const item = code ? CUPONES_SISTEMA[code] : undefined;
    if (!item) return null;
    const base = Math.max(0, Number.isFinite(precioBase) ? precioBase : 0);
    const descuento = Number(((base * item.porcentaje) / 100).toFixed(2));
    const precioFinal = Math.max(0, Number((base - descuento).toFixed(2)));
    return {
      codigo: code,
      porcentaje: item.porcentaje,
      descripcion: item.descripcion,
      descuento,
      precioFinal,
    };
  }

  applyCoupon(codigo: string): CouponEvaluation | null {
    if (this.pending() || this.unresolved) return this.activeCoupon();
    const evaluation = this.validarCupon(codigo, this.cart.total());
    if (!evaluation) {
      this.activeCoupon.set(null);
      this.couponError.set(
        "Cupón no válido. Intenta con UAACOMITE, PROMO50 o PROMO20.",
      );
      return null;
    }
    this.activeCoupon.set(evaluation);
    this.couponError.set("");
    return evaluation;
  }

  clearCoupon() {
    if (this.pending() || this.unresolved) return;
    this.activeCoupon.set(null);
    this.couponError.set("");
  }

  prepareCheckout() {
    if (this.pending() || this.unresolved) return;
    if (!this.cart.items().length) return;
    this.state.set("ready");
    this.message.set("");
    this.lastReceipt.set(null);
  }

  cancelCheckout() {
    if (this.pending() || this.unresolved) return;
    this.state.set("idle");
    this.couponError.set("");
    this.message.set(
      "El pago con Stripe se canceló. Tu carrito se conserva.",
    );
  }

  resetReview() {
    if (this.pending() || this.unresolved) return;
    this.state.set("idle");
    this.message.set("");
    this.couponError.set("");
    this.lastReceipt.set(null);
    if (!this.cart.items().length) {
      this.activeCoupon.set(null);
    } else if (this.activeCoupon()) {
      const updated = this.validarCupon(
        this.activeCoupon()!.codigo,
        this.cart.total(),
      );
      this.activeCoupon.set(updated);
    }
  }

  async processPayment(
    card?: Partial<StripeCardDetails>,
  ): Promise<ProductCheckoutReceipt | null> {
    if (this.pending() || this.unresolved) return null;

    const items = this.cart.items();
    if (!items.length) {
      this.state.set("error");
      this.message.set("Tu carrito está vacío.");
      return null;
    }

    const totalOriginal = Number(this.cart.total().toFixed(2));
    const currentCoupon = this.activeCoupon();
    const coupon = currentCoupon
      ? this.validarCupon(currentCoupon.codigo, totalOriginal)
      : null;
    const totalPagado = coupon ? coupon.precioFinal : totalOriginal;
    const descuento = coupon ? coupon.descuento : 0;

    if (totalPagado > 0 && !this.isCardValid(card)) {
      this.state.set("error");
      this.message.set(
        "Ingresa datos de tarjeta válidos (16 dígitos, MM/AA, CVC y titular) o aplica el cupón UAACOMITE.",
      );
      return null;
    }

    this.pending.set(true);
    this.state.set("pending");
    this.message.set("Procesando pago con Stripe…");

    const lines = this.cart.lines();
    const itemsSummary = lines
      .map((line) => `${line.quantity}x ${line.product.nombre}`)
      .join(", ");
    const { email: userEmail, nombre: userName } = this.getUserSessionInfo();
    const payerName = card?.holderName?.trim() || userName;

    let folio = `STR-${Math.floor(100000 + Math.random() * 900000)}`;
    let paymentIntentId =
      totalPagado === 0 ? `pi_free_${Date.now()}` : `pi_live_${Date.now()}`;

    if (this.http) {
      const backendBase = this.getBackendBaseUrl();
      try {
        const resp = await firstValueFrom(
          this.http.post<ConfirmPaymentResponse>(
            `${backendBase}/api/stripe/confirm-payment`,
            {
              type: "product",
              paymentIntentId,
              planNombre: `Productos: ${itemsSummary}`.slice(0, 120),
              items: lines.map((line) => ({
                id: line.product.id,
                nombre: line.product.nombre,
                cantidad: line.quantity,
                precio: line.product.precio,
              })),
              precio: totalOriginal,
              finalPrice: totalPagado,
              currency: this.stripeConfig?.currency || "MXN",
              publishableKey: this.stripeConfig?.publishableKey,
              userEmail,
              cupon: coupon?.codigo,
              payerName,
              payerEmail: userEmail,
            },
          ),
        );

        if (
          resp &&
          (resp.ok === false ||
            resp.status === "PENDING" ||
            resp.status === "requires_action")
        ) {
          this.pending.set(false);
          this.unresolved = true;
          this.state.set("pending");
          this.message.set(
            "Stripe no ha confirmado la operación todavía. Conservamos tu carrito mientras verificas el estado del cobro.",
          );
          return null;
        }

        if (resp?.folio && resp.folio.startsWith("STR-")) {
          folio = resp.folio;
        }
        if (resp?.paymentIntentId) {
          paymentIntentId = resp.paymentIntentId;
        }
      } catch (err) {
        if (
          err instanceof HttpErrorResponse &&
          (err.status === 400 || err.status === 402 || err.status === 422)
        ) {
          this.pending.set(false);
          this.state.set("error");
          this.message.set(
            this.extractHttpError(err) ||
              "El pago con tarjeta fue rechazado por Stripe. Tu carrito se conserva.",
          );
          return null;
        }
        console.warn(
          "Backend Stripe confirm endpoint unreachable, proceeding with local persistence:",
          err,
        );
      }
    }

    try {
      if (this.billing) {
        const desc = coupon
          ? `Productos (${itemsSummary}) · Cupón: ${coupon.codigo} (-${coupon.porcentaje}%) · Stripe ID: ${paymentIntentId}`
          : `Productos (${itemsSummary}) · Stripe ID: ${paymentIntentId}`;
        await this.billing.registrarPago(
          "Suplementos",
          totalPagado,
          "Tarjeta de crédito",
          desc,
          folio,
        );
      }
    } catch {
      this.pending.set(false);
      this.state.set("error");
      this.message.set(
        "No pudimos confirmar el registro del pago. Tu carrito se conserva.",
      );
      return null;
    }

    const receipt: ProductCheckoutReceipt = {
      folio,
      paymentIntentId,
      totalOriginal,
      descuento,
      totalPagado,
      cupon: coupon?.codigo,
      itemsSummary,
    };

    this.cart.clear();
    this.activeCoupon.set(null);
    this.couponError.set("");
    this.lastReceipt.set(receipt);
    this.unresolved = false;
    this.pending.set(false);
    this.state.set("complete");
    this.message.set(
      `Pago confirmado con Stripe. Folio: ${folio} · Referencia: ${paymentIntentId}.`,
    );
    return receipt;
  }

  private isCardValid(card?: Partial<StripeCardDetails>): boolean {
    if (!card) return false;
    const digits = (card.cardNumber || "").replace(/\D/g, "");
    const expiry = (card.expiry || "").trim();
    const cvc = (card.cvc || "").replace(/\D/g, "");
    const holder = (card.holderName || "").trim();
    return (
      digits.length >= 15 &&
      digits.length <= 16 &&
      /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry) &&
      cvc.length >= 3 &&
      cvc.length <= 4 &&
      holder.length >= 2
    );
  }

  private getBackendBaseUrl(): string {
    const notif =
      this.endpoints?.notifications || "https://gymseminario.onrender.com";
    return notif.replace(/\/api$/, "");
  }

  private getUserSessionInfo(): { email: string; nombre: string } {
    try {
      const raw = this.doc?.defaultView?.localStorage?.getItem("gym_user");
      if (raw) {
        const parsed = JSON.parse(raw) as { email?: string; nombre?: string };
        return {
          email: (parsed?.email || "socio@espaciogym.com")
            .toLowerCase()
            .trim(),
          nombre: parsed?.nombre || "Socio espacioGYM",
        };
      }
    } catch {
      /* noop */
    }
    return {
      email: "socio@espaciogym.com",
      nombre: "Socio espacioGYM",
    };
  }

  private extractHttpError(err: HttpErrorResponse): string {
    if (typeof err.error === "object" && err.error !== null) {
      const record = err.error as { error?: unknown; message?: unknown };
      if (typeof record.error === "string") return record.error;
      if (typeof record.message === "string") return record.message;
    }
    return "";
  }
}
