import { DOCUMENT } from "@angular/common";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { computed, inject, Injectable, signal } from "@angular/core";
import type { Stripe, StripeCardElement } from "@stripe/stripe-js";
import { firstValueFrom } from "rxjs";
import {
  APP_ENDPOINTS,
  backendBaseUrl,
  STRIPE_CONFIG,
  STRIPE_LOADER,
} from "../../../core/config/app-endpoints";
import { BILLING } from "../../billing/data-access/billing.repository";
import { CUPONES_SISTEMA } from "../../memberships/data-access/membership-stripe.service";
import {
  CheckoutStatus,
  CouponEvaluation,
  ProductCheckoutReceipt,
  StripeProductCheckoutInput,
} from "../models/stripe-checkout.model";
import { CartStore } from "./cart.store";

interface CreateIntentResponse {
  exito?: boolean;
  freeCoupon?: boolean;
  freePass?: boolean;
  clientSecret?: string | null;
  paymentIntentId?: string;
  precioFinal?: number;
  finalPrice?: number;
  error?: string;
}

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
  private readonly stripeLoader = inject(STRIPE_LOADER, { optional: true });
  private readonly cart = inject(CartStore);
  private readonly billing = inject(BILLING, { optional: true });
  private readonly doc = inject(DOCUMENT, { optional: true });

  readonly pending = signal(false);
  readonly state = signal<CheckoutStatus>("idle");
  readonly message = signal("");
  readonly activeCoupon = signal<CouponEvaluation | null>(null);
  readonly couponError = signal("");
  readonly lastReceipt = signal<ProductCheckoutReceipt | null>(null);
  readonly cardComplete = signal(false);
  readonly cardError = signal("");
  readonly cardReady = signal(false);

  readonly finalAmount = computed(() => {
    const base = Number(this.cart.total().toFixed(2));
    const coupon = this.activeCoupon();
    if (!coupon) return base;
    return this.validarCupon(coupon.codigo, base)?.precioFinal ?? base;
  });

  readonly isCourtesyBypass = computed(
    () => this.cart.items().length > 0 && this.finalAmount() === 0,
  );

  private stripeInstance: Stripe | null = null;
  private cardElement: StripeCardElement | null = null;
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
    if (evaluation.precioFinal === 0) {
      this.unmountCardElement();
    }
    return evaluation;
  }

  clearCoupon() {
    if (this.pending() || this.unresolved) return;
    this.activeCoupon.set(null);
    this.couponError.set("");
  }

  async mountCardElement(container: HTMLElement): Promise<void> {
    if (!container || this.isCourtesyBypass()) return;
    if (!this.stripeLoader) {
      this.cardError.set("Cargador de Stripe Elements no disponible.");
      return;
    }

    const publishableKey = this.stripeConfig?.publishableKey || "";
    if (!publishableKey) {
      this.cardError.set("Clave pública de Stripe no configurada.");
      return;
    }

    try {
      this.unmountCardElement();
      if (!this.stripeInstance) {
        this.stripeInstance = await this.stripeLoader(publishableKey);
      }
      if (!this.stripeInstance) {
        this.cardError.set(
          "No se pudo cargar Stripe Elements. Verifica tu conexión.",
        );
        return;
      }

      const textColor = this.readThemeColor("--color-text", "#1f2937");
      const placeholderColor = this.readThemeColor(
        "--color-text-secondary",
        "#6b7280",
      );
      const elements = this.stripeInstance.elements();
      this.cardElement = elements.create("card", {
        hidePostalCode: true,
        style: {
          base: {
            fontSize: "15px",
            color: textColor,
            "::placeholder": { color: placeholderColor },
          },
          invalid: { color: "#dc2626" },
        },
      });
      this.cardElement.on("ready", () => this.cardReady.set(true));
      this.cardElement.on("change", (ev) => {
        this.cardComplete.set(ev.complete);
        this.cardError.set(ev.error?.message || "");
      });
      this.cardElement.mount(container);
    } catch {
      this.cardError.set(
        "Stripe Elements no está disponible. Revisa tu conexión e intenta de nuevo.",
      );
    }
  }

  unmountCardElement(): void {
    try {
      this.cardElement?.unmount();
      this.cardElement?.destroy();
    } catch {
      /* noop */
    }
    this.cardElement = null;
    this.cardComplete.set(false);
    this.cardReady.set(false);
    this.cardError.set("");
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
    this.unmountCardElement();
    this.state.set("idle");
    this.couponError.set("");
    this.message.set(
      "El pago con Stripe se canceló. Tu carrito se conserva.",
    );
  }

  resetReview() {
    if (this.pending() || this.unresolved) return;
    this.unmountCardElement();
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
    input?: StripeProductCheckoutInput,
  ): Promise<ProductCheckoutReceipt | null> {
    if (this.pending() || this.unresolved) return null;

    const items = this.cart.items();
    if (!items.length) {
      this.state.set("error");
      this.message.set("Tu carrito está vacío.");
      return null;
    }

    if (!this.http) {
      this.state.set("error");
      this.message.set(
        "No es posible confirmar el pago sin conexión al servidor.",
      );
      return null;
    }

    const totalOriginal = Number(this.cart.total().toFixed(2));
    const currentCoupon = this.activeCoupon();
    const coupon = currentCoupon
      ? this.validarCupon(currentCoupon.codigo, totalOriginal)
      : null;
    const clientTotal = coupon ? coupon.precioFinal : totalOriginal;
    const descuento = coupon ? coupon.descuento : 0;

    if (clientTotal > 0 && (!this.stripeInstance || !this.cardElement || !this.cardComplete())) {
      this.state.set("error");
      this.message.set(
        "Completa los datos de tu tarjeta en Stripe Elements o aplica el cupón UAACOMITE.",
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
    const planNombre = `Productos: ${itemsSummary}`.slice(0, 120);
    const { email: userEmail, nombre: userName } = this.getUserSessionInfo();
    const payerName = input?.holderName?.trim() || userName;
    const backendBase = backendBaseUrl(this.endpoints);
    const payloadItems = lines.map((line) => ({
      id: line.product.id,
      nombre: line.product.nombre,
      cantidad: line.quantity,
      precio: line.product.precio,
    }));

    let intentResp: CreateIntentResponse;
    try {
      intentResp = await firstValueFrom(
        this.http.post<CreateIntentResponse>(
          `${backendBase}/api/stripe/create-payment-intent`,
          {
            type: "product",
            planNombre,
            items: payloadItems,
            precio: totalOriginal,
            cupon: coupon?.codigo,
            userEmail,
          },
        ),
      );
    } catch (err) {
      this.pending.set(false);
      this.state.set("error");
      this.message.set(
        this.extractHttpError(err) ||
          "No se pudo iniciar el cobro en Stripe. Tu carrito se conserva.",
      );
      return null;
    }

    const totalPagado = Number(
      intentResp.precioFinal ?? intentResp.finalPrice ?? clientTotal,
    );
    let paymentIntentId =
      intentResp.paymentIntentId || `pi_free_${Date.now()}`;

    if (totalPagado > 0) {
      if (!intentResp.clientSecret || !this.stripeInstance || !this.cardElement) {
        this.pending.set(false);
        this.state.set("error");
        this.message.set(
          "No se pudo confirmar la sesión de Stripe Elements. Tu carrito se conserva.",
        );
        return null;
      }

      try {
        const confirmResult = await this.stripeInstance.confirmCardPayment(
          intentResp.clientSecret,
          {
            payment_method: {
              card: this.cardElement,
              billing_details: {
                name: payerName,
                email: userEmail,
              },
            },
          },
        );

        if (confirmResult.error) {
          this.pending.set(false);
          this.state.set("error");
          this.message.set(
            confirmResult.error.message ||
              "La tarjeta fue rechazada por Stripe. Tu carrito se conserva.",
          );
          return null;
        }

        if (confirmResult.paymentIntent?.status !== "succeeded") {
          this.pending.set(false);
          this.unresolved = true;
          this.state.set("pending");
          this.message.set(
            "Stripe no ha confirmado la operación todavía. Conservamos tu carrito mientras verificas el estado del cobro.",
          );
          return null;
        }

        paymentIntentId = confirmResult.paymentIntent.id;
      } catch {
        this.pending.set(false);
        this.state.set("error");
        this.message.set(
          "Ocurrió un error al confirmar la tarjeta con Stripe. Tu carrito se conserva.",
        );
        return null;
      }
    }

    let confirmResp: ConfirmPaymentResponse;
    try {
      confirmResp = await firstValueFrom(
        this.http.post<ConfirmPaymentResponse>(
          `${backendBase}/api/stripe/confirm-payment`,
          {
            type: "product",
            paymentIntentId,
            planNombre,
            items: payloadItems,
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
    } catch (err) {
      this.pending.set(false);
      this.state.set("error");
      this.message.set(
        this.extractHttpError(err) ||
          "El servidor no pudo confirmar el pago. No se registró como pagado y tu carrito se conserva.",
      );
      return null;
    }

    if (
      !confirmResp ||
      confirmResp.ok === false ||
      confirmResp.status === "PENDING" ||
      confirmResp.status === "requires_action" ||
      !confirmResp.folio
    ) {
      this.pending.set(false);
      this.unresolved =
        confirmResp?.status === "PENDING" ||
        confirmResp?.status === "requires_action";
      this.state.set(this.unresolved ? "pending" : "error");
      this.message.set(
        confirmResp?.error ||
          "Stripe no ha confirmado la operación todavía. Conservamos tu carrito mientras verificas el estado del cobro.",
      );
      return null;
    }

    const folio = confirmResp.folio;
    paymentIntentId = confirmResp.paymentIntentId || paymentIntentId;

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

    this.unmountCardElement();
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

  private readThemeColor(token: string, fallback: string): string {
    try {
      const view = this.doc?.defaultView;
      const root = this.doc?.documentElement;
      if (!view || !root) return fallback;
      const val = view.getComputedStyle(root).getPropertyValue(token).trim();
      return val || fallback;
    } catch {
      return fallback;
    }
  }

  private extractHttpError(err: unknown): string {
    if (err instanceof HttpErrorResponse && typeof err.error === "object" && err.error !== null) {
      const record = err.error as { error?: unknown; message?: unknown };
      if (typeof record.error === "string") return record.error;
      if (typeof record.message === "string") return record.message;
    }
    return "";
  }
}
