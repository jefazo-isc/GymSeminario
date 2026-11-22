import { InjectionToken } from "@angular/core";
import { environment } from "../../../environments/environment";
export interface ServiceEndpoints {
  notifications: string;
  qr: string;
  statistics: string;
  exercises: string;
  legacyExercises: string;
  coach: string;
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
