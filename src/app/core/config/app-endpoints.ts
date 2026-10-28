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
export const PAYPAL_CONFIG = new InjectionToken<{
  clientId: string;
  currency: string;
}>("PayPal public configuration", {
  providedIn: "root",
  factory: () => environment.paypal,
});
