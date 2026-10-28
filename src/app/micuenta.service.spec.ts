import { TestBed } from "@angular/core/testing";
import { smokeDependencies } from "./testing/smoke-dependencies";

import { MicuentaService } from "./micuenta.service";

describe("MicuentaService", () => {
  let service: MicuentaService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: smokeDependencies() });
    service = TestBed.inject(MicuentaService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
