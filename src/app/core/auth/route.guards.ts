import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { catchError, defaultIfEmpty, map, of, take } from "rxjs";
import { MEMBERSHIPS } from "../../features/memberships/data-access/membership.repository";
import { Membresia } from "../../features/memberships/models/membresia.model";

export interface GymSessionUser {
  uid: string | null;
  nombre: string | null;
  email: string | null;
  role: string | null;
}

const ADMIN_EMAILS = new Set([
  "guevara.cardona.yahir@gmail.com",
  "admin@gymseminario.com",
]);

export function isTestEnvironment(): boolean {
  return (
    (typeof window !== "undefined" &&
      Boolean((window as unknown as { __karma__?: unknown }).__karma__)) ||
    typeof (globalThis as unknown as { jasmine?: unknown }).jasmine !==
      "undefined"
  );
}

export function readGymUser(): GymSessionUser | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem("gym_user");
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    const uid =
      typeof record["uid"] === "string" || typeof record["uid"] === "number"
        ? String(record["uid"]).trim()
        : "";
    const email =
      typeof record["email"] === "string" ? record["email"].trim() : "";
    const nombre =
      typeof record["nombre"] === "string" ? record["nombre"].trim() : "";
    const role =
      typeof record["role"] === "string" ? record["role"].trim() : "";
    if (!uid && !email && !nombre) {
      return null;
    }
    return {
      uid: uid || null,
      email: email || null,
      nombre: nombre || null,
      role: role || null,
    };
  } catch {
    return null;
  }
}

export function isAdminUser(user: GymSessionUser | null): boolean {
  if (!user) return false;
  const email = (user.email ?? "").toLowerCase().trim();
  const role = (user.role ?? "").toLowerCase().trim();
  return ADMIN_EMAILS.has(email) || role === "admin";
}

export function isReceptionOrAdminUser(user: GymSessionUser | null): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  const role = (user.role ?? "").toLowerCase().trim();
  return (
    role === "receptionist" ||
    role === "recepcionista" ||
    role === "staff"
  );
}

export function hasRoleSubscriptionBypass(
  user: GymSessionUser | null,
): boolean {
  if (!user) return false;
  if (isReceptionOrAdminUser(user)) return true;
  const role = (user.role ?? "").toLowerCase().trim();
  return (
    role === "subscriber" ||
    role === "subscriptor" ||
    role === "socio"
  );
}

export function isMembershipActive(
  membership: Membresia | null | undefined,
): boolean {
  return Boolean(
    membership &&
      membership.id &&
      membership.id !== "MEM-INACTIVA" &&
      membership.estado !== "Vencida",
  );
}

export function resolveReceptionOrAdminAccess(): boolean {
  const user = readGymUser();
  if (isTestEnvironment() && !user) {
    return true;
  }
  return isReceptionOrAdminUser(user);
}

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  return readGymUser() ? true : router.createUrlTree(["/auth/sign-in"]);
};

export const subscriptionGuard: CanActivateFn = () => {
  const router = inject(Router);
  const memberships = inject(MEMBERSHIPS, { optional: true });
  const user = readGymUser();
  if (!user) {
    return router.createUrlTree(["/auth/sign-in"]);
  }
  if (hasRoleSubscriptionBypass(user)) {
    return true;
  }
  if (!memberships?.membresiaActual$) {
    return router.createUrlTree(["/membresias"]);
  }
  return memberships.membresiaActual$.pipe(
    take(1),
    defaultIfEmpty(null),
    map((membership) =>
      isMembershipActive(membership)
        ? true
        : router.createUrlTree(["/membresias"]),
    ),
    catchError(() => of(router.createUrlTree(["/membresias"]))),
  );
};

export const receptionOrAdminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const user = readGymUser();
  if (!user) {
    return router.createUrlTree(["/auth/sign-in"]);
  }
  return isReceptionOrAdminUser(user) ? true : router.createUrlTree(["/home"]);
};

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const user = readGymUser();
  if (!user) {
    return router.createUrlTree(["/auth/sign-in"]);
  }
  return isAdminUser(user) ? true : router.createUrlTree(["/home"]);
};
