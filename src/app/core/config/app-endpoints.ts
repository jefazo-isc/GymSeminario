import { InjectionToken } from "@angular/core";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { environment } from "../../../environments/environment";

export interface ServiceEndpoints {
  notifications: string;
  qr: string;
  statistics: string;
  exercises: string;
  legacyExercises: string;
  coach: string;
}

export type StripeLoader = (publishableKey: string) => Promise<Stripe | null>;

export function backendBaseUrl(endpoints?: ServiceEndpoints | null): string {
  const notif = endpoints?.notifications || "https://gymseminario.onrender.com";
  return notif.replace(/\/api$/, "");
}

export const APP_ENDPOINTS = new InjectionToken<ServiceEndpoints>(
  "GROM public service endpoints",
  { providedIn: "root", factory: () => environment.services },
);

export const STRIPE_CONFIG = new InjectionToken<{
  publishableKey: string;
  currency: string;
}>("Stripe public configuration", {
  providedIn: "root",
  factory: () => environment.stripe,
});

export const STRIPE_LOADER = new InjectionToken<StripeLoader>(
  "Stripe.js browser loader",
  { providedIn: "root", factory: () => loadStripe },
);
