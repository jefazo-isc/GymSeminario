import { TestBed } from "@angular/core/testing";
import { Auth } from "@angular/fire/auth";
import { Firestore } from "@angular/fire/firestore";
import { deleteApp, FirebaseApp, initializeApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firstValueFrom } from "rxjs";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  let app: FirebaseApp;

  beforeEach(() => {
    app = initializeApp(
      { apiKey: "unit-test-key", projectId: "unit-test-project" },
      "auth-unit-" + crypto.randomUUID(),
    );
    const auth = initializeAuth(app, { persistence: inMemoryPersistence });
    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: auth },
        { provide: Firestore, useValue: getFirestore(app) },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    await deleteApp(app);
  });
  it("resolves a signed-out in-memory SDK session and clears identity without reading remote user documents", async () => {
    expect(await service.getCurrentUser()).toBeNull();
    expect(await firstValueFrom(service.userUid$)).toBeNull();
    expect(await firstValueFrom(service.userRole$)).toBeNull();
    expect(await firstValueFrom(service.userName$)).toBeNull();
  });
});
