import { InjectionToken, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  AdminMembershipAssignPayload,
  Membresia,
  MembershipHistoryEntry,
  PlanCatalogo,
} from "../models/membresia.model";
import { MembresiaService } from "./membresia.service";

export interface MembershipRepository {
  membresiaActual$: Observable<Membresia | null>;
  loadPlans(): Observable<PlanCatalogo[]>;
  adquirirOActualizarPlan(
    plan: PlanCatalogo,
    periodo?: "Mensual" | "Trimestral" | "Anual",
  ): void | Promise<void>;
  renovarMembresia(): void | Promise<void>;
  cancelarMembresia?(): void | Promise<void>;
  getUserSessionStatus?(): { isLoggedIn: boolean; isAdmin: boolean };
  refreshMembership?(): void;
  loadHistory?(email?: string): Promise<MembershipHistoryEntry[]>;
  lookupClientMembership?(email: string): Promise<Membresia | null>;
  setAutoRenew?(
    autoRenew: boolean,
    membershipId?: string,
  ): Promise<{ ok: boolean; autoRenew: boolean }>;
  adminAssignMembership?(
    payload: AdminMembershipAssignPayload,
  ): Promise<{ ok: boolean; mensaje?: string; membresia?: Membresia }>;
}

export const MEMBERSHIPS = new InjectionToken<MembershipRepository>(
  "MembershipRepository",
  { providedIn: "root", factory: () => inject(MembresiaService) },
);
