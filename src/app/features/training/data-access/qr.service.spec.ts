import { TestBed } from "@angular/core/testing";
import { smokeDependencies } from "../../../testing/smoke-dependencies";

import { QrService } from "./qr.service";

describe("QrService", () => {
  let service: QrService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: smokeDependencies() });
    service = TestBed.inject(QrService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
