import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { firstValueFrom } from "rxjs";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it("resolves a signed-out session and clears identity", async () => {
    expect(await service.getCurrentUser()).toBeNull();
    expect(await firstValueFrom(service.userUid$)).toBeNull();
    expect(await firstValueFrom(service.userRole$)).toBeNull();
    expect(await firstValueFrom(service.userName$)).toBeNull();
  });

  it("restores session from localStorage on init", async () => {
    const user = { uid: 1, email: "test@test.com", nombre: "Test", role: "user" };
    localStorage.setItem("gym_jwt", "fake-token");
    localStorage.setItem("gym_user", JSON.stringify(user));
    // Re-init service
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    expect(await firstValueFrom(service.userName$)).toBe("Test");
    expect(await firstValueFrom(service.userRole$)).toBe("user");
    expect(await firstValueFrom(service.userUid$)).toBe("1");
  });
});
