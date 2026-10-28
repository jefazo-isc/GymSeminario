import { DOCUMENT } from "@angular/common";
import { Injectable, inject } from "@angular/core";
import { PAYPAL_CONFIG } from "../../../core/config/app-endpoints";
import { PayPalBrowserSdk } from "../models/paypal.model";
@Injectable({ providedIn: "root" })
export class PayPalSdkLoader {
  private document = inject(DOCUMENT);
  private config = inject(PAYPAL_CONFIG);
  private pending?: Promise<PayPalBrowserSdk>;
  private sdk(): PayPalBrowserSdk | undefined {
    const view = this.document.defaultView as
      | (Window & { paypal?: PayPalBrowserSdk })
      | null;
    const sdk = view?.paypal;
    return sdk && typeof sdk.Buttons === "function" ? sdk : undefined;
  }
  load(): Promise<PayPalBrowserSdk> {
    const loaded = this.sdk();
    if (loaded) return Promise.resolve(loaded);
    if (this.pending) return this.pending;
    this.pending = new Promise((resolve, reject) => {
      const script = this.document.createElement("script");
      script.async = true;
      script.dataset["gromPaypal"] = "true";
      const query = new URLSearchParams({
        "client-id": this.config.clientId,
        currency: this.config.currency,
      });
      script.src = "https://www.paypal.com/sdk/js?" + query;
      const finish = (error?: Error) => {
        clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
        const sdk = this.sdk();
        if (error || !sdk) {
          script.remove();
          this.pending = undefined;
          reject(error || new Error("SDK PayPal no válido."));
        } else resolve(sdk);
      };
      const timer = setTimeout(
        () => finish(new Error("Tiempo de espera de PayPal agotado.")),
        15000,
      );
      script.onload = () => finish();
      script.onerror = () => finish(new Error("PayPal no disponible."));
      this.document.head.appendChild(script);
    });
    return this.pending;
  }
}
