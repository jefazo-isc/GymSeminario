import { Injectable, inject, signal } from "@angular/core";
import { CheckoutStatus, PayPalButtons } from "../models/paypal.model";
import { CartStore } from "./cart.store";
import { PayPalSdkLoader } from "./paypal-sdk.loader";
@Injectable({ providedIn: "root" })
export class PayPalCheckoutAdapter {
  private loader = inject(PayPalSdkLoader);
  private cart = inject(CartStore);
  private buttons?: PayPalButtons;
  private generation = 0;
  readonly pending = signal(false);
  readonly state = signal<CheckoutStatus>("idle");
  readonly message = signal("");
  // An uncertain capture may not be retried as a fresh purchase by the same adapter.
  private unresolved = false;
  resetReview() {
    if (this.pending() || this.unresolved) return;
    this.state.set("idle");
    this.message.set("");
    this.close();
  }
  close() {
    this.generation++;
    try {
      const result = this.buttons?.close();
      if (result) void result.catch(() => {});
    } catch {}
    this.buttons = undefined;
  }
  async render(container: HTMLElement) {
    if (this.pending() || this.unresolved) return;
    this.close();
    container.replaceChildren();
    const generation = ++this.generation;
    this.state.set("loading");
    const amount = this.cart.total().toFixed(2);
    try {
      const sdk = await this.loader.load();
      if (generation !== this.generation) return;
      this.buttons = sdk.Buttons({
        style: {
          layout: "vertical",
          color: "black",
          shape: "rect",
          label: "paypal",
        },
        createOrder: (_data, actions) => {
          if (this.pending() || this.unresolved)
            throw new Error("Ya existe una operación pendiente.");
          this.pending.set(true);
          return actions.order
            .create({ purchase_units: [{ amount: { value: amount } }] })
            .catch((error) => {
              this.pending.set(false);
              throw error;
            });
        },
        onApprove: async (_data, actions) => {
          this.pending.set(true);
          try {
            const result = await actions.order.capture();
            this.pending.set(false);
            if (result?.status === "COMPLETED") {
              this.unresolved = false;
              this.cart.clear();
              this.state.set("complete");
              this.message.set(
                "PayPal confirmó la captura. Identificador: " +
                  (result.id || "consulta tu cuenta PayPal") +
                  ".",
              );
              this.close();
            } else {
              this.unresolved = true;
              this.state.set("pending");
              this.message.set(
                "PayPal no ha confirmado un pago completado. Revisa su estado en tu cuenta antes de iniciar otra operación.",
              );
              this.close();
            }
          } catch {
            this.pending.set(false);
            this.unresolved = true;
            this.state.set("error");
            this.message.set(
              "No pudimos confirmar el resultado de PayPal. Consulta tu cuenta antes de volver a pagar.",
            );
            this.close();
          }
        },
        onCancel: () => {
          this.pending.set(false);
          this.message.set(
            "La operación de PayPal se canceló. Tu carrito se conserva.",
          );
        },
        onError: () => {
          this.pending.set(false);
          this.unresolved = true;
          this.state.set("error");
          this.message.set(
            "PayPal no pudo completar la operación. Revisa el estado en tu cuenta antes de volver a intentar.",
          );
          this.close();
        },
      });
      await this.buttons.render("#paypal-button-container");
      if (generation === this.generation) this.state.set("ready");
    } catch {
      if (generation === this.generation) {
        this.state.set("unavailable");
        this.message.set(
          "PayPal no está disponible. Revisa conexión o bloqueadores y vuelve a intentar. No se ha iniciado un cobro.",
        );
      }
    }
  }
}
