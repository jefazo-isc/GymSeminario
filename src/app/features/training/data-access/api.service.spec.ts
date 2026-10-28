import { TestBed } from "@angular/core/testing";
import { smokeDependencies } from "../../../testing/smoke-dependencies";

import { ApiService } from "./api.service";

describe("ApiService", () => {
  let service: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: smokeDependencies() });
    service = TestBed.inject(ApiService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
