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
});
