import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { MembresiaService } from "./membresia.service";

describe("MembresiaService", () => {
  let service: MembresiaService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [MembresiaService] });
    service = TestBed.inject(MembresiaService);
  });

  it("debe crearse correctamente", () => {
    expect(service).toBeTruthy();
  });

  it("debe retornar el catálogo de planes con 3 opciones", () => {
    const planes = service.getPlanes();
    expect(planes.length).toBe(3);
    expect(planes.map((p) => p.nombre)).toContain("Pro Fitness");
  });

  it("debe calcular correctamente los días restantes de la membresía", () => {
    const mem = service.getMembresiaActual();
    expect(mem.diasRestantes).toBeGreaterThanOrEqual(0);
  });

  it("debe marcar como Vencida una membresía con fecha pasada", () => {
    const planes = service.getPlanes();
    service.adquirirOActualizarPlan(planes[0], "Mensual");
    // Simulamos vencimiento manual en localStorage
    const stored = JSON.parse(
      localStorage.getItem("espacio_gym_membresia") || "{}",
    );
    stored.fechaFin = "2020-01-01";
    localStorage.setItem("espacio_gym_membresia", JSON.stringify(stored));

    // Re-crear servicio para que recargue
    TestBed.resetTestingModule();
    localStorage.setItem("espacio_gym_membresia", JSON.stringify(stored));
    TestBed.configureTestingModule({ providers: [MembresiaService] });
    const srv2 = TestBed.inject(MembresiaService);
    expect(srv2.getMembresiaActual().estado).toBe("Vencida");
  });

  it("debe actualizar la membresía al adquirir un plan nuevo", () => {
    const planes = service.getPlanes();
    service.adquirirOActualizarPlan(planes[2], "Trimestral"); // Black Elite
    const mem = service.getMembresiaActual();
    expect(mem.nombrePlan).toBe("Black Elite");
    expect(mem.periodo).toBe("Trimestral");
    expect(mem.estado).toBe("Activa");
  });

  it("debe extender la fecha al renovar membresía", () => {
    const planes = service.getPlanes();
    service.adquirirOActualizarPlan(planes[0], "Mensual");
    const antes = service.getMembresiaActual().fechaFin;
    service.renovarMembresia();
    const despues = service.getMembresiaActual().fechaFin;
    expect(despues > antes).toBeTrue();
  });

  it("syncs membership history, auto-renew, and admin assign endpoints", async () => {
    localStorage.clear();
    localStorage.setItem(
      "gym_user",
      JSON.stringify({
        uid: 1,
        email: "admin@gymseminario.com",
        nombre: "Admin",
        role: "admin",
      }),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MembresiaService,
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const srv = TestBed.inject(MembresiaService);

    http
      .expectOne((r) => r.url.includes("/api/membership?email="))
      .flush({ error: "Not found" }, { status: 404, statusText: "Not Found" });

    const histOp = srv.loadHistory("cliente@test.com");
    http
      .expectOne((r) =>
        r.url.includes("/api/membership/history?email=cliente%40test.com"),
      )
      .flush([
        {
          id: 10,
          plan_nombre: "Pro Fitness",
          precio: 550,
          periodo: "Mensual",
          fecha_inicio: "2026-11-01",
          fecha_fin: "2026-12-01",
          estado: "Activa",
        },
      ]);
    const hist = await histOp;
    expect(hist.length).toBe(1);
    expect(hist[0].planNombre).toBe("Pro Fitness");

    const autoOp = srv.setAutoRenew(true, "MEM-849201");
    const autoReq = http.expectOne((r) =>
      r.url.endsWith("/api/membership/auto-renew"),
    );
    expect(autoReq.request.body.autoRenew).toBeTrue();
    autoReq.flush({ ok: true, autoRenew: true });
    expect((await autoOp).autoRenew).toBeTrue();

    const adminOp = srv.adminAssignMembership({
      email: "cliente@test.com",
      action: "assign",
      planNombre: "Black Elite",
      precio: 1200,
      periodo: "Trimestral",
    });
    const adminReq = http.expectOne((r) =>
      r.url.endsWith("/api/admin/memberships/assign"),
    );
    expect(adminReq.request.body.email).toBe("cliente@test.com");
    adminReq.flush({ ok: true, mensaje: "Membresía asignada" });
    expect((await adminOp).ok).toBeTrue();
    http.verify();
  });
});
