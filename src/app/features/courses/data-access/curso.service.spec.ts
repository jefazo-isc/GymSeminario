import { TestBed } from "@angular/core/testing";
import { smokeDependencies } from "../../../testing/smoke-dependencies";

import { CursoService } from "./curso.service";

describe("CursoService", () => {
  let service: CursoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: smokeDependencies() });
    service = TestBed.inject(CursoService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
