import { TestBed } from "@angular/core/testing";
import { smokeDependencies } from "../testing/smoke-dependencies";

import { EjercicioService } from "./ejercicio.service";

describe("EjercicioService", () => {
  let service: EjercicioService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: smokeDependencies() });
    service = TestBed.inject(EjercicioService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
