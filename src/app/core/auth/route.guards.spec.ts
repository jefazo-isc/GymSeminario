import { TestBed } from "@angular/core/testing";
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  GuardResult,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from "@angular/router";
import { BehaviorSubject, firstValueFrom, isObservable, throwError } from "rxjs";
import { MEMBERSHIPS } from "../../features/memberships/data-access/membership.repository";
import { Membresia } from "../../features/memberships/models/membresia.model";
import {
  adminGuard,
  authGuard,
  noReceptionExerciseGuard,
  receptionOrAdminGuard,
  subscriptionGuard,
} from "./route.guards";

describe("Route guards", () => {
  const inactiveMembership: Membresia = {
    id: "MEM-INACTIVA",
    nombrePlan: "Básico",
    precio: 0,
    periodo: "Mensual",
    fechaInicio: "2026-01-01",
    fechaFin: "2026-01-01",
    estado: "Vencida",
    diasRestantes: 0,
    beneficios: [],
  };

  const activeMembership: Membresia = {
    id: "MEM-123456",
    nombrePlan: "Pro Fitness",
    precio: 550,
    periodo: "Mensual",
    fechaInicio: "2026-11-01",
    fechaFin: "2026-12-01",
    estado: "Activa",
    diasRestantes: 15,
    beneficios: ["Acceso total"],
  };

  let membership$: BehaviorSubject<Membresia | null>;
  let router: Router;

  beforeEach(() => {
    localStorage.removeItem("gym_user");
    membership$ = new BehaviorSubject<Membresia | null>(inactiveMembership);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: MEMBERSHIPS,
          useValue: { membresiaActual$: membership$.asObservable() },
        },
      ],
    });
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    localStorage.removeItem("gym_user");
  });

  async function executeGuard(
    guard: CanActivateFn,
    url = "/protegida",
  ): Promise<GuardResult> {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => guard(route, state));
    if (isObservable(result)) {
      return await firstValueFrom(result);
    }
    return await result;
  }

  function expectRedirect(result: GuardResult, expectedUrl: string) {
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe(expectedUrl);
  }

  describe("authGuard", () => {
    it("redirects unauthenticated visitors to /auth/sign-in", async () => {
      const result = await executeGuard(authGuard, "/micuenta");
      expectRedirect(result, "/auth/sign-in");
    });

    it("redirects malformed or empty session payloads to /auth/sign-in", async () => {
      localStorage.setItem("gym_user", "{broken-json");
      expectRedirect(await executeGuard(authGuard), "/auth/sign-in");

      localStorage.setItem("gym_user", JSON.stringify({ role: "admin" }));
      expectRedirect(await executeGuard(authGuard), "/auth/sign-in");
    });

    it("allows authenticated users regardless of role", async () => {
      localStorage.setItem(
        "gym_user",
        JSON.stringify({
          uid: "u-1",
          nombre: "Socio Free",
          email: "free@example.com",
          role: "user",
        }),
      );
      expect(await executeGuard(authGuard, "/micuenta")).toBeTrue();
    });
  });

  describe("subscriptionGuard", () => {
    it("redirects unauthenticated visitors to /auth/sign-in", async () => {
      expectRedirect(await executeGuard(subscriptionGuard, "/f2"), "/auth/sign-in");
    });

    it("redirects authenticated users without subscription or privileged role to /membresias", async () => {
      localStorage.setItem(
        "gym_user",
        JSON.stringify({
          uid: "u-2",
          nombre: "Free",
          email: "free@example.com",
          role: "user",
        }),
      );
      expectRedirect(
        await executeGuard(subscriptionGuard, "/coach-ia"),
        "/membresias",
      );

      membership$.next({ ...activeMembership, estado: "Vencida" });
      expectRedirect(
        await executeGuard(subscriptionGuard, "/f2"),
        "/membresias",
      );

      membership$.next({ ...inactiveMembership, estado: "Activa" });
      expectRedirect(
        await executeGuard(subscriptionGuard, "/f3"),
        "/membresias",
      );

      membership$.next(null);
      expectRedirect(
        await executeGuard(subscriptionGuard, "/actividad"),
        "/membresias",
      );
    });

    it("allows regular users when MEMBERSHIPS emits an active or expiring membership", async () => {
      localStorage.setItem(
        "gym_user",
        JSON.stringify({
          uid: "u-3",
          nombre: "Activo",
          email: "activo@example.com",
          role: "user",
        }),
      );
      membership$.next(activeMembership);
      expect(await executeGuard(subscriptionGuard, "/f2")).toBeTrue();

      membership$.next({ ...activeMembership, estado: "Por vencer" });
      expect(await executeGuard(subscriptionGuard, "/coach-ia")).toBeTrue();
    });

    it("allows subscriber, trainer, and admin roles even with inactive local membership", async () => {
      for (const user of [
        { uid: "s-1", nombre: "Socio", email: "s@example.com", role: "subscriber" },
        { uid: "t-1", nombre: "Coach", email: "t@example.com", role: "trainer" },
        { uid: "t-2", nombre: "Entrenador", email: "t2@example.com", role: "entrenador" },
        { uid: "a-1", nombre: "Admin", email: "a@example.com", role: "admin" },
        {
          uid: "a-2",
          nombre: "Yahir",
          email: "guevara.cardona.yahir@gmail.com",
          role: "user",
        },
        {
          uid: "a-3",
          nombre: "GymAdmin",
          email: "admin@gymseminario.com",
          role: "user",
        },
      ]) {
        localStorage.setItem("gym_user", JSON.stringify(user));
        expect(await executeGuard(subscriptionGuard, "/coach-ia"))
          .withContext(user.email)
          .toBeTrue();
      }
    });

    it("redirects pure reception roles away from coach, booking, and exercise routes to /scanner", async () => {
      membership$.next(activeMembership);
      for (const role of ["receptionist", "reception", "recepcionista", "staff"]) {
        localStorage.setItem(
          "gym_user",
          JSON.stringify({
            uid: "r-only",
            nombre: "Recep",
            email: "recep@example.com",
            role,
          }),
        );
        for (const protectedPath of ["/coach-ia", "/f2", "/f3", "/actividad"]) {
          expectRedirect(
            await executeGuard(subscriptionGuard, protectedPath),
            "/scanner",
          );
        }
        for (const exercisePath of ["/ejercicios", "/videos"]) {
          expectRedirect(
            await executeGuard(noReceptionExerciseGuard, exercisePath),
            "/scanner",
          );
        }
      }

      localStorage.removeItem("gym_user");
      expect(await executeGuard(noReceptionExerciseGuard, "/ejercicios")).toBeTrue();
      localStorage.setItem(
        "gym_user",
        JSON.stringify({
          uid: "sub-1",
          nombre: "Socio",
          email: "sub@example.com",
          role: "subscriber",
        }),
      );
      expect(await executeGuard(noReceptionExerciseGuard, "/videos")).toBeTrue();
      localStorage.setItem(
        "gym_user",
        JSON.stringify({
          uid: "adm-1",
          nombre: "Yahir",
          email: "guevara.cardona.yahir@gmail.com",
          role: "receptionist",
        }),
      );
      expect(await executeGuard(noReceptionExerciseGuard, "/ejercicios")).toBeTrue();
    });

    it("falls back to /membresias if MEMBERSHIPS stream errors", async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          {
            provide: MEMBERSHIPS,
            useValue: {
              membresiaActual$: throwError(() => new Error("storage offline")),
            },
          },
        ],
      });
      router = TestBed.inject(Router);
      localStorage.setItem(
        "gym_user",
        JSON.stringify({
          uid: "u-4",
          nombre: "Err",
          email: "err@example.com",
          role: "user",
        }),
      );
      expectRedirect(
        await executeGuard(subscriptionGuard, "/actividad"),
        "/membresias",
      );
    });
  });

  describe("receptionOrAdminGuard", () => {
    it("redirects unauthenticated visitors to /auth/sign-in", async () => {
      expectRedirect(
        await executeGuard(receptionOrAdminGuard, "/editar1"),
        "/auth/sign-in",
      );
    });

    it("redirects regular and subscriber users to /home", async () => {
      for (const role of ["user", "subscriber", "guest"]) {
        localStorage.setItem(
          "gym_user",
          JSON.stringify({
            uid: "u-5",
            nombre: "Socio",
            email: "socio@example.com",
            role,
          }),
        );
        expectRedirect(
          await executeGuard(receptionOrAdminGuard, "/editar1"),
          "/home",
        );
      }
    });

    it("allows receptionist, reception, trainer, and admin users", async () => {
      for (const user of [
        { uid: "r-1", nombre: "Recep", email: "recep@example.com", role: "receptionist" },
        { uid: "r-2", nombre: "RecepBackend", email: "rec2@example.com", role: "reception" },
        { uid: "t-1", nombre: "Coach", email: "coach@example.com", role: "trainer" },
        { uid: "a-1", nombre: "Admin", email: "admin@example.com", role: "admin" },
        {
          uid: "a-2",
          nombre: "AdminEmail",
          email: "guevara.cardona.yahir@gmail.com",
          role: "user",
        },
        {
          uid: "a-3",
          nombre: "StaffEmail",
          email: "admin@gymseminario.com",
          role: "user",
        },
      ]) {
        localStorage.setItem("gym_user", JSON.stringify(user));
        expect(await executeGuard(receptionOrAdminGuard, "/editar2"))
          .withContext(user.email)
          .toBeTrue();
      }
    });
  });

  describe("adminGuard", () => {
    it("redirects unauthenticated visitors to /auth/sign-in", async () => {
      expectRedirect(
        await executeGuard(adminGuard, "/graficos"),
        "/auth/sign-in",
      );
    });

    it("redirects user, subscriber, and receptionist roles to /home", async () => {
      for (const role of ["user", "subscriber", "receptionist"]) {
        localStorage.setItem(
          "gym_user",
          JSON.stringify({
            uid: "u-6",
            nombre: "NoAdmin",
            email: "noadmin@example.com",
            role,
          }),
        );
        expectRedirect(await executeGuard(adminGuard, "/graficos"), "/home");
      }
    });

    it("allows role=admin and authorized admin emails", async () => {
      for (const user of [
        { uid: "a-1", nombre: "AdminRole", email: "role@example.com", role: "admin" },
        {
          uid: "a-2",
          nombre: "Yahir",
          email: "  GUEVARA.CARDONA.YAHIR@GMAIL.COM ",
          role: "user",
        },
        {
          uid: "a-3",
          nombre: "GymAdmin",
          email: "admin@gymseminario.com",
          role: "user",
        },
      ]) {
        localStorage.setItem("gym_user", JSON.stringify(user));
        expect(await executeGuard(adminGuard, "/graficos"))
          .withContext(user.email)
          .toBeTrue();
      }
    });
  });
});
