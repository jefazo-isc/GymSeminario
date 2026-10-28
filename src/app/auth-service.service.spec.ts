import { TestBed } from "@angular/core/testing";
import { smokeDependencies } from "./testing/smoke-dependencies";

import { AuthServiceService } from "./features/legacy/data-access/auth-service.service";

describe("AuthServiceService", () => {
  let service: AuthServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: smokeDependencies() });
    service = TestBed.inject(AuthServiceService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
