import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { Firestore } from "@angular/fire/firestore";
import { environment } from "../../../environments/environment";
import {
  APP_ENDPOINTS,
  ServiceEndpoints,
} from "../../core/config/app-endpoints";
import { STATISTICS } from "../../features/admin/data-access/statistics.repository";
import { COACH } from "../../features/coach/data-access/coach.repository";
import { PerfilSocio } from "../../features/profile/models/profile.model";
import { EXERCISES } from "../../features/training/data-access/exercise.repository";
import { QR_CODES } from "../../features/training/data-access/qr.repository";
import { TRAINING } from "../../features/training/data-access/training.repository";

describe("Replaceable HTTP boundaries", () => {
  const endpoints: ServiceEndpoints = {
    ...environment.services,
    exercises: "https://example.test/exercises",
    qr: "https://example.test/qr",
    statistics: "https://example.test/stats",
    coach: "https://example.test/api",
    notifications: "https://example.test/notifications",
  };
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENDPOINTS, useValue: endpoints },
        { provide: Firestore, useValue: {} },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it("preserves the existing public destinations rather than silently replacing Render", () => {
    expect(environment.services.notifications).toBe(
      "https://gymseminario.onrender.com",
    );
    expect(environment.services.coach).toBe("http://localhost:3000/api");
    expect(environment.services.qr).toBe(
      "https://api-j6b4.onrender.com/api/user-qr",
    );
  });
  it("reads the exercise endpoint from DI and rejects an incompatible response", () => {
    const fail = jasmine.createSpy("failure");
    TestBed.inject(EXERCISES).getEjercicios().subscribe({ error: fail });
    http.expectOne(endpoints.exercises).flush({
      datosPorParte: [{ parte: "Pecho", ejercicios: [{ nombre: null }] }],
    });
    expect(fail).toHaveBeenCalled();
  });
  it("propagates transport errors without making a second request", () => {
    const fail = jasmine.createSpy("failure");
    TestBed.inject(EXERCISES).getEjercicios().subscribe({ error: fail });
    http
      .expectOne(endpoints.exercises)
      .flush(null, { status: 503, statusText: "Unavailable" });
    expect(fail).toHaveBeenCalled();
    http.expectNone(endpoints.exercises);
  });
  it("requires a real nonempty QR string and encodes the user path segment", () => {
    const fail = jasmine.createSpy();
    TestBed.inject(QR_CODES)
      .getQrData("uid/segment")
      .subscribe({ error: fail });
    http.expectOne(endpoints.qr + "/uid%2Fsegment").flush({ data: 123 });
    expect(fail).toHaveBeenCalled();
  });
  it("rejects negative statistics without substituting demonstration numbers", () => {
    const fail = jasmine.createSpy();
    TestBed.inject(STATISTICS).getStatistics().subscribe({ error: fail });
    http.expectOne(endpoints.statistics).flush({ Pesas: -1 });
    expect(fail).toHaveBeenCalled();
  });
  it("sends the existing routine body and rejects malformed successful routines", () => {
    const profile: PerfilSocio = {
      nombre: "Unit",
      edad: 24,
      peso: 75,
      altura: 175,
      genero: "Otro",
      objetivo: "Fuerza",
      diasDisponibles: 3,
      nivel: "Principiante",
      restriccionesMedicas: "Ninguna",
    };
    const fail = jasmine.createSpy();
    TestBed.inject(COACH).generarRutina(profile).subscribe({ error: fail });
    const request = http.expectOne(endpoints.coach + "/rutina");
    expect(request.request.body).toEqual(profile);
    request.flush({ exito: true, data: { tituloRutina: "Incomplete" } });
    expect(fail).toHaveBeenCalled();
  });
  it("preserves notification payloads and only confirms after the HTTP service replies", async () => {
    let completed = false;
    const operation = TestBed.inject(TRAINING)
      .notifyBooking(
        { email: "unit@example.test", displayName: "Unit", phoneNumber: null },
        { entrenamiento: "Pesas", fecha: "2099-01-01", turno: "Mañana" },
      )
      .then((result) => {
        completed = true;
        return result;
      });
    const request = http.expectOne(endpoints.notifications + "/enviar-correo");
    expect(request.request.body).toEqual({
      correo: "unit@example.test",
      nombre: "Unit",
      entrenamiento: "Pesas",
      fecha: "2099-01-01",
      turno: "Mañana",
    });
    expect(completed).toBeFalse();
    request.flush({ ok: true });
    expect(await operation).toBe("email");
  });
  it("does not send a request when the registration has no notification contact", async () => {
    expect(
      await TestBed.inject(TRAINING).notifyAttendance(
        { email: null, displayName: null, phoneNumber: null },
        { clase: "Box", fecha: "2099-01-01", hora: "10:00", alumno: "Unit" },
        "Unit",
      ),
    ).toBe("no-contact");
    http.expectNone((r) => r.url.startsWith(endpoints.notifications));
  });
});
