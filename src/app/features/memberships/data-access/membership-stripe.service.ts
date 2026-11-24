import { DOCUMENT } from "@angular/common";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import type { Stripe, StripeCardElement } from "@stripe/stripe-js";
import { firstValueFrom, Observable, of } from "rxjs";
import Swal from "sweetalert2";
import {
  APP_ENDPOINTS,
  backendBaseUrl,
  STRIPE_CONFIG,
  STRIPE_LOADER,
} from "../../../core/config/app-endpoints";
import { escapeHtml } from "../../../shared/ui/escape-html";
import { SESSION } from "../../auth/data-access/session.repository";
import { BILLING } from "../../billing/data-access/billing.repository";
import { PlanCatalogo } from "../models/membresia.model";
import { MEMBERSHIPS } from "./membership.repository";

export type BillingPeriod = "Mensual" | "Trimestral" | "Anual";

export interface CuponInfo {
  codigo: string;
  porcentaje: number;
  descripcion: string;
  descuento: number;
  precioFinal: number;
}

export interface ResultadoPagoStripe {
  success: boolean;
  folio?: string;
  error?: string;
  cupon?: string;
  monto?: number;
}

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
  folio?: string;
  paymentIntentId?: string;
  montoPagado?: number;
  error?: string;
}

export const CUPONES_SISTEMA: Record<
  string,
  { porcentaje: number; descripcion: string }
> = {
  UAACOMITE: {
    porcentaje: 100,
    descripcion: "Cortesía Institucional Comité Evaluador UAA",
  },
  COMITE: {
    porcentaje: 100,
    descripcion: "Cortesía Institucional Comité Evaluador",
  },
  WACOMYT: {
    porcentaje: 100,
    descripcion: "Cortesía Institucional Comité Evaluador",
  },
  WACOM: {
    porcentaje: 100,
    descripcion: "Cortesía Institucional Comité Evaluador",
  },
  UAA: {
    porcentaje: 100,
    descripcion: "Beca Universitaria UAA 100%",
  },
  COMITEUAA: {
    porcentaje: 100,
    descripcion: "Cortesía Institucional Comité Evaluador UAA",
  },
  PROMO50: {
    porcentaje: 50,
    descripcion: "Beca Deportiva 50%",
  },
  PROMO20: {
    porcentaje: 20,
    descripcion: "Convenio Institucional 20%",
  },
  PROMO10: {
    porcentaje: 10,
    descripcion: "Descuento Especial 10%",
  },
};

@Injectable({
  providedIn: "root",
})
export class MembershipStripeService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly endpoints = inject(APP_ENDPOINTS, { optional: true });
  private readonly stripeConfig = inject(STRIPE_CONFIG, { optional: true });
  private readonly stripeLoader = inject(STRIPE_LOADER, { optional: true });
  private readonly membershipRepo = inject(MEMBERSHIPS, { optional: true });
  private readonly billingRepo = inject(BILLING, { optional: true });
  private readonly session = this.http ? inject(SESSION, { optional: true }) : null;
  private readonly doc = inject(DOCUMENT, { optional: true });

  private promoteLocalUserRoleToSubscriber(): void {
    try {
      const storage = this.doc?.defaultView?.localStorage;
      const raw = storage?.getItem("gym_user");
      if (!storage || !raw) return;
      const user = JSON.parse(raw) as { role?: string };
      const role = String(user?.role || "user").toLowerCase().trim();
      if (role === "user" || !role) {
        storage.setItem(
          "gym_user",
          JSON.stringify({ ...user, role: "subscriber" }),
        );
      }
    } catch {
      /* noop */
    }
  }

  private getUserSessionInfo(): { email: string; nombre: string } {
    try {
      const raw = this.doc?.defaultView?.localStorage?.getItem("gym_user");
      if (raw) {
        const u = JSON.parse(raw) as { email?: string; nombre?: string };
        return {
          email: (u?.email || "socio@espaciogym.com").toLowerCase().trim(),
          nombre: u?.nombre || "Socio espacioGYM",
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

  /**
   * Valida un código de cupón y calcula el importe con descuento.
   */
  validarCupon(codigo: string, precioBase: number): CuponInfo | null {
    const code = (codigo || "").trim().toUpperCase();
    if (!code || !CUPONES_SISTEMA[code]) return null;
    const item = CUPONES_SISTEMA[code];
    const descuento = Number(((precioBase * item.porcentaje) / 100).toFixed(2));
    const precioFinal = Math.max(0, Number((precioBase - descuento).toFixed(2)));
    return {
      codigo: code,
      porcentaje: item.porcentaje,
      descripcion: item.descripcion,
      descuento,
      precioFinal,
    };
  }

  /**
   * Inicia el flujo oficial de pagos con Stripe Elements y Motor de Cupones.
   */
  async iniciarFlujoPagoStripe(
    plan: PlanCatalogo,
    periodo: BillingPeriod,
    precio: number,
  ): Promise<ResultadoPagoStripe> {
    const { email: userEmail, nombre: userName } = this.getUserSessionInfo();
    let cuponActivo: CuponInfo | null = null;
    let precioActual = precio;
    let resolvedSuccess = false;
    let finalFolio = "";
    let lastError = "";
    let stripeInstance: Stripe | null = null;
    let cardElement: StripeCardElement | null = null;
    let cardComplete = false;

    await Swal.fire({
      title: "Pasarela Oficial Stripe · espacioGYM",
      html: `
        <div style="text-align: left; font-size: 0.9rem; line-height: 1.5;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); color: white; padding: 14px 16px; border-radius: 10px; margin-bottom: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.9; font-weight: 700;">Stripe Elements Seguro</span>
              <span style="background: rgba(255,255,255,0.22); font-size: 0.7rem; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">PCI-DSS Level 1</span>
            </div>
            <div style="font-size: 1.2rem; font-weight: 800;">${escapeHtml(plan.nombre)} · Ciclo ${escapeHtml(periodo)}</div>
            <div id="stripe-display-price" style="font-size: 1.35rem; font-weight: 900; margin-top: 4px;">
              $${precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px;">
            <label for="stripe-coupon-input" style="display: block; font-size: 0.75rem; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
              ¿Tienes un cupón de descuento o beca?
            </label>
            <div style="display: flex; gap: 8px;">
              <input id="stripe-coupon-input" type="text" placeholder="Ej. UAACOMITE"
                style="flex: 1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.875rem; text-transform: uppercase; font-weight: 600;" />
              <button id="stripe-btn-apply-coupon" type="button"
                style="background: #4f46e5; color: white; border: none; border-radius: 6px; padding: 8px 14px; font-size: 0.8125rem; font-weight: 700; cursor: pointer;">
                Aplicar
              </button>
            </div>
            <div id="stripe-coupon-msg" style="margin-top: 6px; font-size: 0.8rem; display: none;"></div>
          </div>

          <div id="stripe-free-banner" style="display: none; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; text-align: left;">
            <div style="font-weight: 700; color: #065f46; font-size: 0.875rem; margin-bottom: 2px;">
              🎓 Cortesía Institucional Aprobada (100%)
            </div>
            <div style="color: #047857; font-size: 0.8rem; line-height: 1.4;">
              Tu membresía y acceso al Coach IA se activarán sin cobro a tarjeta bancaria.
            </div>
          </div>

          <div id="stripe-card-form" style="margin-bottom: 14px;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em;">
              Tarjeta Bancaria (Stripe Elements)
            </div>
            <div style="margin-bottom: 8px;">
              <input id="stripe-card-holder" type="text" placeholder="Nombre en la tarjeta" value="${escapeHtml(userName)}"
                style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.875rem;" />
            </div>
            <div id="stripe-membership-card-element" style="padding: 11px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff; min-height: 42px;"></div>
            <div id="stripe-membership-card-errors" style="margin-top: 6px; font-size: 0.8rem; color: #dc2626; min-height: 18px;"></div>
          </div>

          <div style="text-align: center; margin-top: 14px;">
            <button id="stripe-btn-submit-payment" type="button"
              style="width: 100%; background: #4f46e5; color: white; border: none; border-radius: 8px; padding: 12px 18px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: background 0.2s;">
              Pagar $${precio.toFixed(2)} MXN con Stripe
            </button>
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      cancelButtonColor: "#94a3b8",
      width: "480px",
      didOpen: (popup) => {
        const couponInput = popup.querySelector(
          "#stripe-coupon-input",
        ) as HTMLInputElement;
        const btnApplyCoupon = popup.querySelector(
          "#stripe-btn-apply-coupon",
        ) as HTMLButtonElement;
        const couponMsg = popup.querySelector(
          "#stripe-coupon-msg",
        ) as HTMLElement;
        const displayPrice = popup.querySelector(
          "#stripe-display-price",
        ) as HTMLElement;
        const cardForm = popup.querySelector(
          "#stripe-card-form",
        ) as HTMLElement;
        const freeBanner = popup.querySelector(
          "#stripe-free-banner",
        ) as HTMLElement;
        const submitBtn = popup.querySelector(
          "#stripe-btn-submit-payment",
        ) as HTMLButtonElement;
        const holderInput = popup.querySelector(
          "#stripe-card-holder",
        ) as HTMLInputElement;
        const cardMount = popup.querySelector(
          "#stripe-membership-card-element",
        ) as HTMLElement;
        const cardErrors = popup.querySelector(
          "#stripe-membership-card-errors",
        ) as HTMLElement;

        const mountStripeCard = async () => {
          if (!cardMount || !this.stripeLoader) return;
          const pubKey = this.stripeConfig?.publishableKey || "";
          if (!pubKey) {
            if (cardErrors) {
              cardErrors.textContent = "Clave pública de Stripe no configurada.";
            }
            return;
          }
          try {
            stripeInstance = await this.stripeLoader(pubKey);
            if (!stripeInstance) {
              if (cardErrors) {
                cardErrors.textContent =
                  "No se pudo inicializar Stripe Elements. Revisa tu conexión.";
              }
              return;
            }
            const elements = stripeInstance.elements();
            cardElement = elements.create("card", {
              hidePostalCode: true,
              style: {
                base: {
                  fontSize: "15px",
                  color: "#1e293b",
                  "::placeholder": { color: "#94a3b8" },
                },
                invalid: { color: "#dc2626" },
              },
            });
            cardElement.mount(cardMount);
            cardElement.on("change", (ev) => {
              cardComplete = ev.complete;
              if (cardErrors) {
                cardErrors.textContent = ev.error?.message || "";
              }
            });
          } catch {
            if (cardErrors) {
              cardErrors.textContent =
                "Stripe Elements no disponible temporalmente.";
            }
          }
        };
        void mountStripeCard();

        const aplicarCupon = () => {
          const rawCode = couponInput.value.trim().toUpperCase();
          const info = this.validarCupon(rawCode, precio);
          if (info) {
            cuponActivo = info;
            precioActual = info.precioFinal;
            couponMsg.style.display = "block";
            couponMsg.style.color = "#16a34a";
            couponMsg.textContent = `✓ ${info.descripcion} (${info.porcentaje}% de descuento aplicado)`;

            if (info.precioFinal === 0) {
              displayPrice.innerHTML = `
                <span style="text-decoration: line-through; opacity: 0.6; font-size: 1.1rem; margin-right: 8px;">
                  $${precio.toFixed(2)} MXN
                </span>
                <span style="color: #4ade80;">$0.00 MXN</span>
              `;
              if (cardForm) cardForm.style.display = "none";
              if (freeBanner) freeBanner.style.display = "block";
              if (submitBtn) {
                submitBtn.style.background = "#059669";
                submitBtn.innerText =
                  "✨ Activar Membresía (Cortesía Institucional)";
              }
            } else {
              displayPrice.innerHTML = `
                <span style="text-decoration: line-through; opacity: 0.6; font-size: 1.1rem; margin-right: 8px;">
                  $${precio.toFixed(2)} MXN
                </span>
                <span style="color: #a7f3d0;">$${info.precioFinal.toFixed(2)} MXN</span>
              `;
              if (cardForm) cardForm.style.display = "block";
              if (freeBanner) freeBanner.style.display = "none";
              if (submitBtn) {
                submitBtn.style.background = "#4f46e5";
                submitBtn.innerText = `Pagar $${info.precioFinal.toFixed(2)} MXN con Stripe`;
              }
            }
          } else {
            cuponActivo = null;
            precioActual = precio;
            couponMsg.style.display = "block";
            couponMsg.style.color = "#dc2626";
            couponMsg.innerText =
              "✗ Cupón no válido. Intenta con UAACOMITE o PROMO50.";
          }
        };

        if (btnApplyCoupon) btnApplyCoupon.onclick = aplicarCupon;
        if (couponInput) {
          couponInput.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              aplicarCupon();
            }
          });
        }

        if (submitBtn) {
          submitBtn.onclick = async () => {
            if (precioActual > 0) {
              if (!stripeInstance || !cardElement) {
                void Swal.showValidationMessage(
                  "Stripe Elements aún se está cargando o no está disponible.",
                );
                return;
              }
              if (!cardComplete) {
                void Swal.showValidationMessage(
                  "Completa los datos de tu tarjeta en Stripe o aplica el cupón UAACOMITE.",
                );
                return;
              }
            }

            Swal.showLoading();
            try {
              const payerName = holderInput?.value?.trim() || userName;
              const res = await this.procesarPagoYActivacion({
                plan,
                periodo,
                precioOriginal: precio,
                precioFinal: precioActual,
                cupon: cuponActivo?.codigo,
                userEmail,
                userName: payerName,
                stripe: stripeInstance,
                cardElement,
              });
              resolvedSuccess = true;
              finalFolio = res.folio;
              Swal.close();
            } catch (err) {
              lastError =
                err instanceof Error
                  ? err.message
                  : "No se pudo completar el cobro con Stripe.";
              void Swal.fire(
                "No se completó el pago",
                lastError,
                "error",
              );
            }
          };
        }
      },
      willClose: () => {
        try {
          cardElement?.unmount();
          cardElement?.destroy();
        } catch {
          /* noop */
        }
        cardElement = null;
      },
    });

    return {
      success: resolvedSuccess,
      folio: finalFolio || undefined,
      error: lastError || undefined,
      cupon: cuponActivo?.codigo,
      monto: precioActual,
    };
  }

  /**
   * Crea el PaymentIntent en el backend, confirma con Stripe Elements cuando monto > 0,
   * y confirma en /api/stripe/confirm-payment. Nunca activa membresías si el servidor falla.
   */
  async procesarPagoYActivacion(params: {
    plan: PlanCatalogo;
    periodo: BillingPeriod;
    precioOriginal: number;
    precioFinal: number;
    cupon?: string;
    userEmail: string;
    userName: string;
    stripe?: Stripe | null;
    cardElement?: StripeCardElement | null;
  }): Promise<{ ok: boolean; folio: string; paymentIntentId: string }> {
    if (!this.http) {
      throw new Error("Cliente HTTP no disponible para confirmar el pago con Stripe.");
    }

    const backendBase = backendBaseUrl(this.endpoints);
    let intentResp: CreateIntentResponse;
    try {
      intentResp = await firstValueFrom(
        this.http.post<CreateIntentResponse>(
          `${backendBase}/api/stripe/create-payment-intent`,
          {
            planId: params.plan.id,
            planNombre: params.plan.nombre,
            precio: params.precioOriginal,
            userEmail: params.userEmail,
            periodo: params.periodo,
            cupon: params.cupon,
          },
        ),
      );
    } catch (err) {
      throw new Error(
        this.extractErrorMessage(
          err,
          "No se pudo iniciar la intención de pago en Stripe.",
        ),
      );
    }

    const serverFinal = Number(
      intentResp.precioFinal ?? intentResp.finalPrice ?? params.precioFinal,
    );
    let paymentIntentId =
      intentResp.paymentIntentId || `pi_free_${Date.now()}`;

    if (serverFinal > 0) {
      if (!intentResp.clientSecret) {
        throw new Error(
          "El servidor no devolvió clientSecret válido de Stripe.",
        );
      }
      if (!params.stripe || !params.cardElement) {
        throw new Error(
          "Stripe Elements no está montado para confirmar el cargo con tarjeta.",
        );
      }

      const confirmResult = await params.stripe.confirmCardPayment(
        intentResp.clientSecret,
        {
          payment_method: {
            card: params.cardElement,
            billing_details: {
              name: params.userName,
              email: params.userEmail,
            },
          },
        },
      );

      if (confirmResult.error) {
        throw new Error(
          confirmResult.error.message ||
            "La tarjeta fue rechazada por Stripe.",
        );
      }
      if (confirmResult.paymentIntent?.status !== "succeeded") {
        throw new Error(
          `El pago quedó en estado ${confirmResult.paymentIntent?.status || "pendiente"}. No se activó la membresía.`,
        );
      }
      paymentIntentId = confirmResult.paymentIntent.id;
    }

    let confirmResp: ConfirmPaymentResponse;
    try {
      confirmResp = await firstValueFrom(
        this.http.post<ConfirmPaymentResponse>(
          `${backendBase}/api/stripe/confirm-payment`,
          {
            paymentIntentId,
            planNombre: params.plan.nombre,
            precio: params.precioOriginal,
            finalPrice: serverFinal,
            userEmail: params.userEmail,
            periodo: params.periodo,
            cupon: params.cupon,
            payerName: params.userName,
            payerEmail: params.userEmail,
            beneficios: params.plan.beneficios,
          },
        ),
      );
    } catch (err) {
      throw new Error(
        this.extractErrorMessage(
          err,
          "El servidor no pudo confirmar el pago. No se registró como pagado.",
        ),
      );
    }

    if (confirmResp?.ok === false || !confirmResp?.folio) {
      throw new Error(
        confirmResp?.error ||
          "La confirmación de pago en el servidor no fue exitosa.",
      );
    }

    const folio = confirmResp.folio;
    paymentIntentId = confirmResp.paymentIntentId || paymentIntentId;

    this.promoteLocalUserRoleToSubscriber();

    if (this.membershipRepo) {
      await this.membershipRepo.adquirirOActualizarPlan(
        { ...params.plan, precio: serverFinal },
        params.periodo,
      );
    }

    if (this.billingRepo) {
      const descPago = params.cupon
        ? `Membresía ${params.plan.nombre} (${params.periodo}) · Cupón: ${params.cupon} · Stripe ID: ${paymentIntentId}`
        : `Membresía ${params.plan.nombre} (${params.periodo}) · Stripe ID: ${paymentIntentId}`;

      await this.billingRepo.registrarPago(
        "Mensualidad",
        serverFinal,
        "Tarjeta de crédito",
        descPago,
        folio,
      );
    }

    if (this.session && typeof this.session.upgradeToSubscriber === "function") {
      this.session.upgradeToSubscriber();
    }
    try {
      const storage = this.doc?.defaultView?.localStorage;
      const raw = storage?.getItem("gym_user");
      if (raw) {
        const u = JSON.parse(raw) as { role?: string };
        if (u.role !== "admin") {
          u.role = "subscriber";
          storage?.setItem("gym_user", JSON.stringify(u));
        }
      }
    } catch {
      /* noop */
    }

    await Swal.fire({
      icon: "success",
      title: "¡Pago Confirmado con Stripe!",
      html: `
        <div style="text-align: left; font-size: 0.92rem; line-height: 1.6;">
          <p style="margin-bottom: 6px;"><strong>Membresía:</strong> ${escapeHtml(params.plan.nombre)} (${escapeHtml(params.periodo)})</p>
          <p style="margin-bottom: 6px;"><strong>Folio de Recibo:</strong> <span style="font-family: monospace; font-weight: bold; color: #4f46e5;">${escapeHtml(folio)}</span></p>
          <p style="margin-bottom: 8px;"><strong>Referencia Stripe:</strong> <span style="font-family: monospace; color: #475569;">${escapeHtml(paymentIntentId)}</span></p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin: 10px 0;">
            <div style="font-weight: 600; font-size: 0.75rem; color: #64748b; margin-bottom: 4px; text-transform: uppercase;">
              Detalle de Facturación Oficial
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Monto de Membresía:</span> <strong>$${params.precioOriginal.toFixed(2)} MXN</strong>
            </div>
            ${
              params.cupon
                ? `<div style="display: flex; justify-content: space-between; color: #16a34a; font-size: 0.82rem;">
                     <span>Cupón Aplicado (${escapeHtml(params.cupon)}):</span>
                     <span>-$${(params.precioOriginal - serverFinal).toFixed(2)} MXN</span>
                   </div>`
                : ""
            }
            <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px dashed #cbd5e1; margin-top: 4px; padding-top: 4px; color: #16a34a;">
              <span>Total Pagado:</span> <span>$${serverFinal.toFixed(2)} MXN</span>
            </div>
          </div>

          <p style="color: #15803d; font-weight: 600; margin-top: 10px; text-align: center;">
            ⚡ ¡Tu cuenta ahora es Socio Activo! Acceso total a instalaciones y Coach IA.
          </p>
        </div>
      `,
      confirmButtonText: "Aceptar",
      confirmButtonColor: "#4f46e5",
    });

    return { ok: true, folio, paymentIntentId };
  }

  /**
   * Consulta el historial contable de transacciones Stripe.
   */
  consultarTransacciones(email?: string): Observable<unknown[]> {
    if (!this.http) return of([]);
    const base = backendBaseUrl(this.endpoints);
    const url = email
      ? `${base}/api/stripe/transactions?email=${encodeURIComponent(email)}`
      : `${base}/api/stripe/transactions`;
    return this.http.get<unknown[]>(url);
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && err.error && typeof err.error === "object") {
      const body = err.error as { error?: unknown; mensaje?: unknown };
      if (typeof body.error === "string" && body.error) return body.error;
      if (typeof body.mensaje === "string" && body.mensaje) return body.mensaje;
    }
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  }
}
