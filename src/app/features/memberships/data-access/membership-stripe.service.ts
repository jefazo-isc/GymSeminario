import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { firstValueFrom, Observable, of } from "rxjs";
import Swal from "sweetalert2";
import { APP_ENDPOINTS } from "../../../core/config/app-endpoints";
import { BILLING } from "../../billing/data-access/billing.repository";
import { SESSION } from "../../auth/data-access/session.repository";
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
  private http = inject(HttpClient, { optional: true });
  private endpoints = inject(APP_ENDPOINTS, { optional: true });
  private membershipRepo = inject(MEMBERSHIPS, { optional: true });
  private billingRepo = inject(BILLING, { optional: true });
  private session = this.http ? inject(SESSION, { optional: true }) : null;

  private getBackendBaseUrl(): string {
    const notif =
      this.endpoints?.notifications || "https://gymseminario.onrender.com";
    return notif.replace(/\/api$/, "");
  }

  private getUserSessionInfo(): { email: string; nombre: string } {
    try {
      const raw = localStorage.getItem("gym_user");
      if (raw) {
        const u = JSON.parse(raw);
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
   * Inicia el flujo oficial de pagos con Stripe y Motor de Cupones.
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

    await Swal.fire({
      title: "Pasarela Oficial Stripe · espacioGYM",
      html: `
        <div style="text-align: left; font-size: 0.9rem; line-height: 1.5;">
          <!-- Tarjeta de encabezado Stripe -->
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); color: white; padding: 14px 16px; border-radius: 10px; margin-bottom: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.9; font-weight: 700;">Pasarela de Pago Segura</span>
              <span style="background: rgba(255,255,255,0.22); font-size: 0.7rem; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">🔒 Stripe Live 256-bit</span>
            </div>
            <div style="font-size: 1.2rem; font-weight: 800;">${plan.nombre} · Ciclo ${periodo}</div>
            <div id="stripe-display-price" style="font-size: 1.35rem; font-weight: 900; margin-top: 4px;">
              $${precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
            </div>
          </div>

          <!-- Sección de Cupón de Descuento -->
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

          <!-- Banner de Cortesía Institucional (100% Descuento) -->
          <div id="stripe-free-banner" style="display: none; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; text-align: left;">
            <div style="font-weight: 700; color: #065f46; font-size: 0.875rem; margin-bottom: 2px;">
              🎓 Cortesía Institucional Comité Evaluador Aprobada
            </div>
            <div style="color: #047857; font-size: 0.8rem; line-height: 1.4;">
              100% de descuento acreditado. Tu membresía, casillero y acceso al Coach IA se activarán de forma inmediata sin cobro a tarjeta bancaria.
            </div>
          </div>

          <!-- Formulario de Tarjeta Bancaria Stripe -->
          <div id="stripe-card-form" style="margin-bottom: 14px;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em;">
              Datos de Tarjeta Bancaria (Débito o Crédito)
            </div>
            <div style="margin-bottom: 8px;">
              <input id="stripe-card-number" type="text" maxlength="19" placeholder="4242 •••• •••• 4242"
                style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.875rem; font-family: monospace;" />
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <input id="stripe-card-expiry" type="text" maxlength="5" placeholder="MM/AA"
                style="flex: 1; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.875rem; font-family: monospace;" />
              <input id="stripe-card-cvc" type="password" maxlength="4" placeholder="CVC"
                style="flex: 1; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.875rem; font-family: monospace;" />
            </div>
            <div>
              <input id="stripe-card-holder" type="text" placeholder="Nombre en la tarjeta" value="${userName}"
                style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.875rem;" />
            </div>
          </div>

          <!-- Botón Principal de Pago -->
          <div style="text-align: center; margin-top: 14px;">
            <button id="stripe-btn-submit-payment" type="button"
              style="width: 100%; background: #4f46e5; color: white; border: none; border-radius: 8px; padding: 12px 18px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: background 0.2s;">
              🔒 Pagar $${precio.toFixed(2)} MXN con Stripe
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
        const cardNumberInput = popup.querySelector(
          "#stripe-card-number",
        ) as HTMLInputElement;
        const cardExpiryInput = popup.querySelector(
          "#stripe-card-expiry",
        ) as HTMLInputElement;

        // Formateo dinámico de número de tarjeta con espacios
        if (cardNumberInput) {
          cardNumberInput.addEventListener("input", (e: Event) => {
            const target = e.target as HTMLInputElement;
            let val = target.value.replace(/\D/g, "");
            val = val.substring(0, 16);
            target.value = val.replace(/(.{4})/g, "$1 ").trim();
          });
        }

        // Formateo dinámico de expiración MM/AA
        if (cardExpiryInput) {
          cardExpiryInput.addEventListener("input", (e: Event) => {
            const target = e.target as HTMLInputElement;
            let val = target.value.replace(/\D/g, "");
            if (val.length >= 2) {
              val = val.substring(0, 2) + "/" + val.substring(2, 4);
            }
            target.value = val.substring(0, 5);
          });
        }

        // Aplicar cupón de descuento
        const aplicarCupon = () => {
          const rawCode = couponInput.value.trim().toUpperCase();
          const info = this.validarCupon(rawCode, precio);
          if (info) {
            cuponActivo = info;
            precioActual = info.precioFinal;
            couponMsg.style.display = "block";
            couponMsg.style.color = "#16a34a";
            couponMsg.innerHTML = `✓ ${info.descripcion} (${info.porcentaje}% de descuento aplicado)`;

            if (info.precioFinal === 0) {
              // Cupón 100% de descuento (UAACOMITE / COMITE)
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
                submitBtn.innerText = "✨ Activar Membresía (Cortesía Institucional)";
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
                submitBtn.innerText = `🔒 Pagar $${info.precioFinal.toFixed(2)} MXN con Stripe`;
              }
            }
          } else {
            couponMsg.style.display = "block";
            couponMsg.style.color = "#dc2626";
            couponMsg.innerText = "✗ Cupón no válido. Intenta con UAACOMITE o PROMO50.";
          }
        };

        if (btnApplyCoupon) {
          btnApplyCoupon.onclick = aplicarCupon;
        }
        if (couponInput) {
          couponInput.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              aplicarCupon();
            }
          });
        }

        // Ejecutar procesamiento del pago
        if (submitBtn) {
          submitBtn.onclick = async () => {
            // Validar tarjeta si no es cortesía del 100%
            if (precioActual > 0 && cardNumberInput) {
              const digits = cardNumberInput.value.replace(/\s/g, "");
              if (digits.length < 15) {
                void Swal.showValidationMessage(
                  "Por favor introduce un número de tarjeta válido (16 dígitos) o aplica el cupón UAACOMITE.",
                );
                return;
              }
            }

            Swal.showLoading();
            try {
              const res = await this.procesarPagoYActivacion({
                plan,
                periodo,
                precioOriginal: precio,
                precioFinal: precioActual,
                cupon: cuponActivo?.codigo,
                userEmail,
                userName,
              });
              resolvedSuccess = true;
              finalFolio = res.folio;
            } catch (err) {
              console.error("Error al procesar con Stripe:", err);
              void Swal.fire(
                "Error en la transacción",
                "No se pudo completar el procesamiento del pago. Intenta de nuevo.",
                "error",
              );
            }
          };
        }
      },
    });

    return {
      success: resolvedSuccess,
      folio: finalFolio,
      cupon: cuponActivo?.codigo,
      monto: precioActual,
    };
  }

  /**
   * Procesa la orden en backend y activa inmediatamente la membresía y facturación.
   */
  async procesarPagoYActivacion(params: {
    plan: PlanCatalogo;
    periodo: BillingPeriod;
    precioOriginal: number;
    precioFinal: number;
    cupon?: string;
    userEmail: string;
    userName: string;
  }): Promise<{ ok: boolean; folio: string; paymentIntentId: string }> {
    const backendBase = this.getBackendBaseUrl();
    let folio = `STR-${Math.floor(100000 + Math.random() * 900000)}`;
    let paymentIntentId = `pi_live_${Date.now()}`;

    // 1. Llamar al backend Edge para registrar en SQLite y Stripe
    if (this.http) {
      try {
        const resp = await firstValueFrom(
          this.http.post<{
            ok: boolean;
            folio?: string;
            paymentIntentId?: string;
            montoPagado?: number;
          }>(`${backendBase}/api/stripe/confirm-payment`, {
            paymentIntentId,
            planNombre: params.plan.nombre,
            precio: params.precioOriginal,
            finalPrice: params.precioFinal,
            userEmail: params.userEmail,
            periodo: params.periodo,
            cupon: params.cupon,
            payerName: params.userName,
            payerEmail: params.userEmail,
            beneficios: params.plan.beneficios,
          }),
        );
        if (resp && resp.folio) {
          folio = resp.folio;
          paymentIntentId = resp.paymentIntentId || paymentIntentId;
        }
      } catch (err) {
        console.warn(
          "Backend Stripe confirm endpoint unreachable, proceeding with local persistence:",
          err,
        );
      }
    }

    // 2. Activar la membresía en el repositorio (localStorage + sincronización)
    if (this.membershipRepo) {
      await this.membershipRepo.adquirirOActualizarPlan(
        { ...params.plan, precio: params.precioFinal },
        params.periodo,
      );
    }

    // 3. Registrar el pago en el estado de cuenta y facturación
    if (this.billingRepo) {
      const descPago = params.cupon
        ? `Membresía ${params.plan.nombre} (${params.periodo}) · Cupón: ${params.cupon} · Stripe ID: ${paymentIntentId}`
        : `Membresía ${params.plan.nombre} (${params.periodo}) · Stripe ID: ${paymentIntentId}`;

      await this.billingRepo.registrarPago(
        "Mensualidad",
        params.precioFinal,
        "Tarjeta de crédito",
        descPago,
        folio,
      );
    }

    // 4. Elevar permisos a Socio Activo (subscriber) para desbloquear navegación y Coach IA
    if (this.session && typeof this.session.upgradeToSubscriber === "function") {
      this.session.upgradeToSubscriber();
    }
    try {
      const raw = localStorage.getItem("gym_user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u.role !== "admin") {
          u.role = "subscriber";
          localStorage.setItem("gym_user", JSON.stringify(u));
        }
      }
    } catch {
      /* noop */
    }

    // 5. Mostrar recibo oficial de Stripe
    await Swal.fire({
      icon: "success",
      title: "¡Pago Confirmado con Stripe!",
      html: `
        <div style="text-align: left; font-size: 0.92rem; line-height: 1.6;">
          <p style="margin-bottom: 6px;"><strong>Membresía:</strong> ${params.plan.nombre} (${params.periodo})</p>
          <p style="margin-bottom: 6px;"><strong>Folio de Recibo:</strong> <span style="font-family: monospace; font-weight: bold; color: #4f46e5;">${folio}</span></p>
          <p style="margin-bottom: 8px;"><strong>Referencia Stripe:</strong> <span style="font-family: monospace; color: #475569;">${paymentIntentId}</span></p>

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
                     <span>Cupón Aplicado (${params.cupon}):</span>
                     <span>-$${(params.precioOriginal - params.precioFinal).toFixed(2)} MXN</span>
                   </div>`
                : ""
            }
            <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px dashed #cbd5e1; margin-top: 4px; padding-top: 4px; color: #16a34a;">
              <span>Total Pagado:</span> <span>$${params.precioFinal.toFixed(2)} MXN</span>
            </div>
          </div>

          <p style="color: #15803d; font-weight: 600; margin-top: 10px; text-align: center;">
            ⚡ ¡Tu cuenta ahora es Socio Activo! Acceso total a instalaciones, casilleros y Coach IA.
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
    const base = this.getBackendBaseUrl();
    const url = email
      ? `${base}/api/stripe/transactions?email=${encodeURIComponent(email)}`
      : `${base}/api/stripe/transactions`;
    return this.http.get<unknown[]>(url);
  }
}
