import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { calculateBmi, bmiCategory } from "../models/profile.model";
import { PerfilSocioService } from "./perfil-socio.service";

describe("PerfilSocioService anthropometric measurements & cloud sync", () => {
  afterEach(() => localStorage.clear());

  it("computes BMI and category accurately", () => {
    expect(calculateBmi(70, 175)).toBe(22.9);
    expect(bmiCategory(22.9)).toBe("Peso saludable");
    expect(bmiCategory(31.2)).toBe("Obesidad");
  });

  it("syncs GET/PUT /api/profile and POST /api/profile/measurements with health alerts", async () => {
    localStorage.clear();
    localStorage.setItem("gym_jwt", "jwt-token");
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PerfilSocioService,
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(PerfilSocioService);

    const syncOp = service.syncProfileFromServer();
    http.expectOne((r) => r.url.endsWith("/api/profile")).flush({
      nombre: "Socio Real",
      peso: 80,
      altura: 180,
      restricciones_medicas: "Lesión lumbar",
      healthAlerts: [
        { nivel: "danger", mensaje: "Restricción activa: Lesión lumbar" },
      ],
    });
    const synced = await syncOp;
    expect(synced.synced).toBeTrue();
    expect(synced.perfil.nombre).toBe("Socio Real");
    expect(synced.healthAlerts).toContain("Restricción activa: Lesión lumbar");

    const saveMeas = service.saveMeasurement({
      peso: 80,
      altura: 180,
      cintura: 84,
      pecho: 102,
      brazo: 36,
      grasaCorporal: 16,
      restriccionesMedicas: "Lesión lumbar",
    });
    const postReq = http.expectOne((r) =>
      r.url.endsWith("/api/profile/measurements"),
    );
    expect(postReq.request.method).toBe("POST");
    postReq.flush({
      measurement: {
        id: 1,
        peso: 80,
        altura: 180,
        imc: 24.7,
        cintura: 84,
        pecho: 102,
        brazo: 36,
        grasa_corporal: 16,
        fecha: "2026-11-22",
      },
      healthAlerts: [
        { nivel: "danger", mensaje: "Restricción activa: Lesión lumbar" },
      ],
    });
    const measRes = await saveMeas;
    expect(measRes.measurement.imc).toBe(24.7);
    expect(measRes.measurement.grasaCorporal).toBe(16);
    http.verify();
  });
});
