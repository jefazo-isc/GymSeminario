import { InjectionToken, inject } from "@angular/core";
import { Observable } from "rxjs";
import { Membresia, PlanCatalogo } from "../models/membresia.model";
import { MembresiaService } from "./membresia.service";
export interface MembershipRepository {
  membresiaActual$: Observable<Membresia | null>;
  loadPlans(): Observable<PlanCatalogo[]>;
  adquirirOActualizarPlan(
    plan: PlanCatalogo,
    periodo?: "Mensual" | "Trimestral" | "Anual",
  ): void | Promise<void>;
  renovarMembresia(): void | Promise<void>;
}
export const MEMBERSHIPS = new InjectionToken<MembershipRepository>(
  "MembershipRepository",
  { providedIn: "root", factory: () => inject(MembresiaService) },
);
