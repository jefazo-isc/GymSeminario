import { TestBed } from "@angular/core/testing";
import { smokeDependencies } from "../../../testing/smoke-dependencies";

import { UsuarioService } from "./usuario.service";

describe("UsuarioService", () => {
  let service: UsuarioService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: smokeDependencies() });
    service = TestBed.inject(UsuarioService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
