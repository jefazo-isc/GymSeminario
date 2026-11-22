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
import { SesionService } from "../../features/activity/data-access/sesion.service";
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
  it("generates a local QR code starting with GROM- without HTTP call", (done) => {
    TestBed.inject(QR_CODES)
      .getQrData("uid/segment")
      .subscribe({
        next: (result) => {
          expect(result.data).toMatch(/^GROM-[A-F0-9]+$/);
          done();
        },
        error: done.fail,
      });
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

  it("executes SQLite bookings and attendances GET, PUT, and DELETE through TRAINING", async () => {
    const training = TestBed.inject(TRAINING);

    let loadedBookings: unknown[] = [];
    training.bookings().subscribe((rows) => (loadedBookings = rows));
    const getBk = http.expectOne(endpoints.notifications + "/api/bookings");
    expect(getBk.request.method).toBe("GET");
    getBk.flush([
      {
        id: "bk-1",
        entrenamiento: "Yoga",
        fecha: "2026-11-22",
        turno: "Mañana",
        nombre: "Ana",
      },
    ]);
    expect(loadedBookings.length).toBe(1);

    const putOp = training.updateBooking("bk-1", {
      entrenamiento: "Crossfit",
      fecha: "2026-11-23",
      turno: "Tarde",
      nombre: "Ana",
    });
    const putBk = http.expectOne(endpoints.notifications + "/api/bookings/bk-1");
    expect(putBk.request.method).toBe("PUT");
    putBk.flush({ ok: true });
    await putOp;

    const delOp = training.deleteBooking("bk-1");
    const delBk = http.expectOne(endpoints.notifications + "/api/bookings/bk-1");
    expect(delBk.request.method).toBe("DELETE");
    delBk.flush({ ok: true });
    await delOp;
  });

  it("persists workout logs and syncs session availability in SesionService", async () => {
    localStorage.removeItem("gym_user");
    const activity = TestBed.inject(SesionService);
    const syncOp = activity.syncFromServer();

    http
      .expectOne(endpoints.notifications + "/api/sessions/availability")
      .flush({
        fecha: "2026-11-22",
        capacidadPorTurno: 20,
        slots: [
          {
            disciplina: "Boxeo",
            turno: "Matutino",
            capacidad: 20,
            reservados: 5,
          },
          {
            disciplina: "Yoga",
            turno: "Vespertino",
            capacidad: 20,
            reservados: 7,
          },
          {
            disciplina: "Pesas",
            turno: "Nocturno",
            capacidad: 20,
            reservados: 2,
          },
        ],
      });
    http.expectOne(endpoints.notifications + "/api/bookings").flush([]);
    http.expectOne(endpoints.notifications + "/api/attendances").flush([]);
    for (let i = 0; i < 4; i++) {
      await Promise.resolve();
    }
    http.expectOne(endpoints.notifications + "/api/workout-logs").flush([]);
    await syncOp;

    let latestShifts: string[] = [];
    activity.ocupacion$?.subscribe((list) => {
      latestShifts = list.map((s) => `${s.turno}:${s.inscritos}`);
    });
    expect(latestShifts).toEqual(["Mañana:5", "Tarde:7", "Noche:2"]);

    const addOp = activity.addWorkoutLog({
      ejercicio: "Sentadilla",
      grupoMuscular: "Pierna",
      series: 4,
      repeticiones: 10,
      pesoKg: 80,
      fecha: "2026-11-22",
    });
    const postLog = http.expectOne(endpoints.notifications + "/api/workout-logs");
    expect(postLog.request.method).toBe("POST");
    postLog.flush({
      ok: true,
      log: {
        id: "wl-99",
        ejercicio: "Sentadilla",
        grupo_muscular: "Pierna",
        series: 4,
        repeticiones: "10",
        peso_kg: 80,
        fecha: "2026-11-22",
      },
    });
    const saved = await addOp;
    expect(saved.id).toBe("wl-99");
  });

  it("loads and persists assigned routines through COACH /routines endpoints", () => {
    const coach = TestBed.inject(COACH);
    const sampleRoutine = {
      tituloRutina: "Fuerza Base",
      objetivo: "Fuerza",
      nivelRecomendado: "Intermedio",
      diasSemana: [
        {
          dia: "Día 1",
          grupoMuscular: "Pecho",
          ejercicios: [
            {
              nombre: "Press banca",
              series: 4,
              repeticiones: "8",
              descansoSegundos: 90,
            },
          ],
        },
      ],
      recomendacionesGenerales: "Calentar 10 minutos",
    };

    coach.getRoutines?.("cliente@example.com").subscribe((rows) => {
      expect(rows.length).toBe(1);
      expect(rows[0].rutina.tituloRutina).toBe("Fuerza Base");
    });
    const getReq = http.expectOne(
      endpoints.coach + "/routines?email=cliente%40example.com",
    );
    expect(getReq.request.method).toBe("GET");
    getReq.flush([
      {
        id: "rt-1",
        userEmail: "cliente@example.com",
        rutina: sampleRoutine,
      },
    ]);

    coach
      .saveRoutine?.({
        rutina: sampleRoutine,
        targetEmail: "cliente@example.com",
      })
      .subscribe((saved) => {
        expect(saved.id).toBe("rt-2");
      });
    const postReq = http.expectOne(endpoints.coach + "/routines");
    expect(postReq.request.method).toBe("POST");
    expect((postReq.request.body as { userEmail?: string }).userEmail).toBe(
      "cliente@example.com",
    );
    postReq.flush({
      ok: true,
      routine: {
        id: "rt-2",
        userEmail: "cliente@example.com",
        rutina: sampleRoutine,
      },
    });
  });
});
