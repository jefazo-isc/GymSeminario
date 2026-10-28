import { TestBed } from "@angular/core/testing";
import { smokeDependencies } from "../testing/smoke-dependencies";

import { WindowService } from "./window.service";

describe("WindowService", () => {
  let service: WindowService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: smokeDependencies() });
    service = TestBed.inject(WindowService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
