import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, throwError } from "rxjs";
import { AuthService } from "../../features/auth/data-access/auth.service";
import { RutinaService } from "../../features/coach/data-access/rutina.service";
import {
  CoachIaComponent,
  validRoutine,
} from "../../features/coach/pages/coach-ia/coach-ia.component";
import { Membresia } from "../../features/memberships/models/membresia.model";
import { MEMBERSHIPS } from "../../features/memberships/data-access/membership.repository";
import { SESSION } from "../../features/auth/data-access/session.repository";
import { ACTIVITY } from "../../features/activity/data-access/activity.repository";
import { PerfilSocioService } from "../../features/profile/data-access/perfil-socio.service";

describe("Coach responses", () => {
  const profile = {
    nombre: "Unit example",
    edad: 24,
    peso: 75,
    altura: 175,
    genero: "Masculino",
    objetivo: "Ganancia muscular",
    diasDisponibles: 4,
    nivel: "Intermedio",
    restriccionesMedicas: "Ninguna",
  };
  const routine = {
    tituloRutina: "Unit routine",
    objetivo: "Example",
    nivelRecomendado: "Intermedio",
    diasSemana: [
      {
        dia: "Día 1",
        grupoMuscular: "Pecho",
        ejercicios: [
          {
            nombre: "Example movement",
            series: 3,
            repeticiones: "10",
            descansoSegundos: 60,
          },
        ],
      },
    ],
    recomendacionesGenerales: "Unit test only",
  };
  let service: any;
  beforeEach(() => {
    service = {
      obtenerCoaches: jasmine.createSpy().and.returnValue(
        of([
          {
            id: "unit",
            nombre: "Unit coach",
            emoji: "◎",
            titulo: "Example",
            frase: "Example greeting",
          },
        ]),
      ),
      generarRutina: jasmine.createSpy(),
      enviarMensajeChat: jasmine.createSpy(),
    };
    TestBed.configureTestingModule({
      imports: [CoachIaComponent],
      providers: [
        provideRouter([]),
        { provide: RutinaService, useValue: service },
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: () =>
              Promise.resolve({ uid: "unit", displayName: "Unit example" }),
            userName$: of("Unit example"),
          },
        },
        {
          provide: PerfilSocioService,
          useValue: {
            getPerfilActual: () => profile,
            perfil$: of(profile),
            actualizarNombre: () => {},
          },
        },
      ],
    });
  });
  function create() {
    const fixture = TestBed.createComponent(CoachIaComponent);
    fixture.detectChanges();
    return fixture;
  }
  it("never presents fallback data as a successful personalized response", () => {
    service.generarRutina.and.returnValue(
      of({ exito: false, data: routine, error: "Quota unavailable" }),
    );
    const component = create().componentInstance;
    component.generarRutina();
    expect(component.rutina).toBeNull();
    expect(component.errorMensaje).toBe("Quota unavailable");
    expect(component.cargando).toBeFalse();
  });
  it("rejects malformed responses instead of fabricating a routine", () => {
    service.generarRutina.and.returnValue(
      of({ exito: true, data: { tituloRutina: "Malformed" } }),
    );
    const component = create().componentInstance;
    component.generarRutina();
    expect(component.rutina).toBeNull();
    expect(validRoutine({ diasSemana: [] })).toBeFalse();
    expect(component.errorMensaje).toContain("válida");
  });
  it("keeps a valid cache source visible and renders the actual returned days", async () => {
    service.generarRutina.and.returnValue(
      of({ exito: true, origen: "cache", data: routine }),
    );
    const fixture = create();
    await fixture.whenStable();
    fixture.componentInstance.generarRutina();
    fixture.detectChanges();
    expect(fixture.componentInstance.rutina).toEqual(routine);
    expect(fixture.nativeElement.textContent).toContain("almacenada en caché");
    expect(fixture.nativeElement.querySelectorAll(".routine-day").length).toBe(
      1,
    );
  });
  it("keeps transport errors recoverable and does not append them as coach answers", () => {
    service.enviarMensajeChat.and.returnValue(
      throwError(() => new Error("offline")),
    );
    const component = create().componentInstance;
    component.mensajeInput = "A unit question";
    component.enviarMensaje();
    expect(component.enviandoMensaje).toBeFalse();
    expect(component.mensajes.length).toBe(1);
    expect(component.mensajes[0].remitente).toBe("usuario");
    expect(component.chatError).toContain("conserva");
    component.retryMessage();
    expect(service.enviarMensajeChat.calls.count()).toBe(2);
    expect(component.mensajes.length).toBe(1);
  });
  it("opens every actual routine day for printing and restores the previous state afterwards", async () => {
    service.generarRutina.and.returnValue(
      of({
        exito: true,
        origen: "gemini",
        data: {
          ...routine,
          diasSemana: [
            ...routine.diasSemana,
            { ...routine.diasSemana[0], dia: "Día 2" },
          ],
        },
      }),
    );
    const fixture = create();
    await fixture.whenStable();
    fixture.componentInstance.generarRutina();
    fixture.detectChanges();
    const details: HTMLDetailsElement[] = Array.from(
      fixture.nativeElement.querySelectorAll(".routine-day"),
    );
    expect(details[1].open).toBeFalse();
    spyOn(window, "print").and.stub();
    fixture.componentInstance.imprimirRutina();
    expect(details.every((detail) => detail.open)).toBeTrue();
    window.dispatchEvent(new Event("afterprint"));
    expect(details[1].open).toBeFalse();
  });
});

describe("Coach subscription gate", () => {
  const inactiveMembership: Membresia = {
    id: "MEM-INACTIVA",
    nombrePlan: "Básico",
    precio: 0,
    periodo: "Mensual",
    fechaInicio: "2026-01-01",
    fechaFin: "2026-01-01",
    estado: "Vencida",
    diasRestantes: 0,
    beneficios: [],
  };

  afterEach(() => {
    localStorage.removeItem("gym_user");
  });

  function setupGate(userJson: object | null, userName: string | null) {
    if (userJson) {
      localStorage.setItem("gym_user", JSON.stringify(userJson));
    } else {
      localStorage.removeItem("gym_user");
    }

    const serviceSpy = {
      obtenerCoaches: jasmine.createSpy().and.returnValue(of([])),
      generarRutina: jasmine.createSpy(),
      enviarMensajeChat: jasmine.createSpy(),
    };

    TestBed.configureTestingModule({
      imports: [CoachIaComponent],
      providers: [
        provideRouter([]),
        { provide: RutinaService, useValue: serviceSpy },
        {
          provide: SESSION,
          useValue: {
            getCurrentUser: () => Promise.resolve(null),
            userName$: of(userName),
            userRole$: of((userJson as { role?: string } | null)?.role || null),
          },
        },
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: () => Promise.resolve(null),
            userName$: of(userName),
          },
        },
        {
          provide: MEMBERSHIPS,
          useValue: {
            membresiaActual$: of(inactiveMembership),
          },
        },
        {
          provide: PerfilSocioService,
          useValue: {
            getPerfilActual: () => ({
              nombre: "Socio",
              edad: 25,
              peso: 70,
              altura: 170,
              genero: "Otro",
              objetivo: "Fuerza",
              diasDisponibles: 3,
              nivel: "Principiante",
              restriccionesMedicas: "Ninguna",
            }),
            perfil$: of({
              nombre: "Socio",
              edad: 25,
              peso: 70,
              altura: 170,
              genero: "Otro",
              objetivo: "Fuerza",
              diasDisponibles: 3,
              nivel: "Principiante",
              restriccionesMedicas: "Ninguna",
            }),
            actualizarNombre: () => {},
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(CoachIaComponent);
    fixture.detectChanges();
    return { fixture, serviceSpy };
  }

  it("blocks logged-in user without subscription from configuring a routine or spending AI tokens", () => {
    const { fixture, serviceSpy } = setupGate(
      { nombre: "Usuario Gratis", email: "free@example.com", role: "user" },
      "Usuario Gratis",
    );
    const comp = fixture.componentInstance;
    expect(comp.usuarioAutenticado).toBeTrue();
    expect(comp.tieneSuscripcion).toBeFalse();
    expect(fixture.nativeElement.querySelector(".routine-form")).toBeNull();
    expect(fixture.nativeElement.querySelector(".coach-locked")).not.toBeNull();

    comp.generarRutina();
    comp.mensajeInput = "Quiero una rutina";
    comp.enviarMensaje();
    expect(serviceSpy.generarRutina).not.toHaveBeenCalled();
    expect(serviceSpy.enviarMensajeChat).not.toHaveBeenCalled();
  });

  it("blocks unauthenticated visitors completely", () => {
    const { fixture, serviceSpy } = setupGate(null, null);
    const comp = fixture.componentInstance;
    expect(comp.usuarioAutenticado).toBeFalse();
    expect(comp.tieneSuscripcion).toBeFalse();
    expect(fixture.nativeElement.querySelector(".routine-form")).toBeNull();

    comp.generarRutina();
    expect(serviceSpy.generarRutina).not.toHaveBeenCalled();
  });

  it("allows subscriber role to access the routine generator", () => {
    const { fixture } = setupGate(
      { nombre: "Socio Pago", email: "socio@example.com", role: "subscriber" },
      "Socio Pago",
    );
    const comp = fixture.componentInstance;
    expect(comp.usuarioAutenticado).toBeTrue();
    expect(comp.tieneSuscripcion).toBeTrue();
    expect(fixture.nativeElement.querySelector(".routine-form")).not.toBeNull();
  });

  it("blocks pure reception users from Coach IA and renders zero lock icons", () => {
    const { fixture, serviceSpy } = setupGate(
      { nombre: "Recep", email: "recep@example.com", role: "reception" },
      "Recep",
    );
    const comp = fixture.componentInstance;
    expect(comp.usuarioAutenticado).toBeTrue();
    expect(comp.tieneSuscripcion).toBeFalse();
    expect(comp.esEntrenadorOAdmin).toBeFalse();
    expect(fixture.nativeElement.querySelector(".routine-form")).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain("🔒");

    comp.generarRutina();
    comp.mensajeInput = "Ayuda con rutina";
    comp.enviarMensaje();
    expect(serviceSpy.generarRutina).not.toHaveBeenCalled();
    expect(serviceSpy.enviarMensajeChat).not.toHaveBeenCalled();
  });

  it("loads saved routines on init, persists newly generated routines, and supports trainer assignment", () => {
    const savedRoutine = {
      tituloRutina: "Rutina Guardada",
      objetivo: "Fuerza máxima",
      nivelRecomendado: "Intermedio",
      diasSemana: [
        {
          dia: "Día 1",
          grupoMuscular: "Pierna",
          ejercicios: [
            {
              nombre: "Sentadilla",
              series: 4,
              repeticiones: "8",
              descansoSegundos: 90,
            },
          ],
        },
      ],
      recomendacionesGenerales: "Hidratación constante",
    };
    localStorage.setItem(
      "gym_user",
      JSON.stringify({
        uid: "t-1",
        nombre: "Coach",
        email: "coach@example.com",
        role: "trainer",
      }),
    );

    const coachSpy = {
      obtenerCoaches: jasmine.createSpy().and.returnValue(of([])),
      generarRutina: jasmine
        .createSpy()
        .and.returnValue(of({ exito: true, origen: "gemini", data: savedRoutine })),
      enviarMensajeChat: jasmine.createSpy().and.returnValue(
        of({ exito: true, coach: "Coach", respuesta: "Sigue así" }),
      ),
      getRoutines: jasmine.createSpy().and.returnValue(
        of([
          {
            id: "rt-10",
            userEmail: "coach@example.com",
            rutina: savedRoutine,
          },
        ]),
      ),
      saveRoutine: jasmine.createSpy().and.returnValue(
        of({
          id: "rt-11",
          userEmail: "cliente@example.com",
          rutina: savedRoutine,
        }),
      ),
      updateRoutine: jasmine.createSpy().and.returnValue(
        of({
          id: "rt-10",
          userEmail: "cliente@example.com",
          rutina: savedRoutine,
        }),
      ),
    };

    TestBed.configureTestingModule({
      imports: [CoachIaComponent],
      providers: [
        provideRouter([]),
        { provide: RutinaService, useValue: coachSpy },
        {
          provide: SESSION,
          useValue: {
            getCurrentUser: () => Promise.resolve(null),
            userName$: of("Coach"),
            userRole$: of("trainer"),
          },
        },
        {
          provide: MEMBERSHIPS,
          useValue: { membresiaActual$: of(inactiveMembership) },
        },
        {
          provide: PerfilSocioService,
          useValue: {
            perfil$: of({
              nombre: "Coach",
              edad: 30,
              peso: 80,
              altura: 178,
              genero: "Masculino",
              objetivo: "Fuerza máxima",
              diasDisponibles: 4,
              nivel: "Intermedio",
              restriccionesMedicas: "Ninguna",
            }),
            actualizarNombre: () => {},
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(CoachIaComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.esEntrenadorOAdmin).toBeTrue();
    expect(coachSpy.getRoutines).toHaveBeenCalledWith(undefined);
    expect(comp.rutina?.tituloRutina).toBe("Rutina Guardada");
    expect(comp.savedRoutineId).toBe("rt-10");

    comp.modoEntrenador = true;
    comp.clientEmail = "cliente@example.com";
    comp.guardarRutinaActual();
    expect(coachSpy.updateRoutine).toHaveBeenCalledWith("rt-10", {
      rutina: comp.rutina!,
      targetEmail: "cliente@example.com",
      assignedBy: "coach@example.com",
    });
    expect(comp.routineFeedback).toContain("cliente@example.com");
  });

  it("synthesizes coach voice on button click, caches audio URL, and toggles auto-voz", () => {
    localStorage.setItem(
      "gym_user",
      JSON.stringify({
        uid: "s-voice",
        nombre: "Socio",
        email: "socio@example.com",
        role: "subscriber",
      }),
    );

    const coachSpy = {
      obtenerCoaches: jasmine.createSpy().and.returnValue(
        of([
          {
            id: "temach",
            nombre: "El Temach",
            emoji: "🪖",
            titulo: "Modo Guerra",
            frase: "Cero excusas.",
          },
        ]),
      ),
      generarRutina: jasmine.createSpy(),
      enviarMensajeChat: jasmine.createSpy().and.returnValue(
        of({
          exito: true,
          coach: "El Temach",
          respuesta: "A darle con todo, compa.",
        }),
      ),
      sintetizarVozCoach: jasmine.createSpy().and.returnValue(
        of({
          exito: true,
          coachId: "temach",
          origen: "chatterbox",
          mimeType: "audio/wav",
          audioBase64: btoa("RIFF-WAV-TEST"),
        }),
      ),
      leerPreferenciaAutoVoz: jasmine.createSpy().and.returnValue(false),
      guardarPreferenciaAutoVoz: jasmine.createSpy(),
    };

    const playSpy = spyOn(HTMLAudioElement.prototype, "play").and.returnValue(
      Promise.resolve(),
    );
    spyOn(HTMLAudioElement.prototype, "pause").and.stub();

    TestBed.configureTestingModule({
      imports: [CoachIaComponent],
      providers: [
        provideRouter([]),
        { provide: RutinaService, useValue: coachSpy },
        {
          provide: SESSION,
          useValue: {
            getCurrentUser: () => Promise.resolve(null),
            userName$: of("Socio"),
            userRole$: of("subscriber"),
          },
        },
        {
          provide: PerfilSocioService,
          useValue: {
            perfil$: of({
              nombre: "Socio",
              edad: 25,
              peso: 75,
              altura: 175,
              genero: "Masculino",
              objetivo: "Ganancia muscular",
              diasDisponibles: 4,
              nivel: "Intermedio",
              restriccionesMedicas: "Ninguna",
            }),
            actualizarNombre: () => {},
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(CoachIaComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    comp.abrirPestanaChat();
    fixture.detectChanges();
    expect(comp.pestanaActiva).toBe("chat");
    expect(playSpy).toHaveBeenCalled();

    comp.mensajeInput = "¿Qué entreno hoy?";
    comp.enviarMensaje();
    fixture.detectChanges();

    expect(comp.mensajes.length).toBe(2);
    expect(coachSpy.sintetizarVozCoach).not.toHaveBeenCalled();

    const listenBtn = fixture.nativeElement.querySelector(
      ".btn-listen-coach",
    ) as HTMLButtonElement;
    expect(listenBtn).not.toBeNull();
    listenBtn.click();
    fixture.detectChanges();

    expect(coachSpy.sintetizarVozCoach).toHaveBeenCalledOnceWith(
      "temach",
      "A darle con todo, compa.",
    );
    const coachMsg = comp.mensajes[1];
    expect(coachMsg.audioSrc).toBeTruthy();
    expect(coachMsg.reproduciendo).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain(
      "Voz clonada (Chatterbox)",
    );

    // Stop playback then replay from message cache without a second TTS request
    listenBtn.click();
    expect(coachMsg.reproduciendo).toBeFalse();
    listenBtn.click();
    expect(coachMsg.reproduciendo).toBeTrue();
    expect(coachSpy.sintetizarVozCoach.calls.count()).toBe(1);

    // Enable auto-voz and confirm new coach reply triggers TTS automatically
    comp.toggleAutoVoz();
    expect(comp.autoVoz).toBeTrue();
    expect(coachSpy.guardarPreferenciaAutoVoz).toHaveBeenCalledWith(true);

    comp.mensajeInput = "Otra duda";
    comp.enviarMensaje();
    expect(coachSpy.sintetizarVozCoach.calls.count()).toBe(2);
  });

  it("skips intro voice for custom body-part coaches, sends attendance/weight JSON telemetry, and renders Markdown tables", () => {
    localStorage.setItem(
      "gym_user",
      JSON.stringify({
        uid: "s-custom",
        nombre: "Socio",
        email: "socio@example.com",
        role: "subscriber",
      }),
    );

    const torsoCoach = {
      id: "torso",
      nombre: 'Héctor "Titan" Morales',
      emoji: "▲",
      titulo: "Especialista en Tren Superior",
      especialidad: "Tren Superior",
      personalizado: true,
      hasIntroAudio: false,
      hasVoice: false,
      frase: "Progresión para tren superior.",
    };
    const piernaCoach = {
      id: "pierna",
      nombre: 'Valeria "Apex" Navarro',
      emoji: "◆",
      titulo: "Especialista en Tren Inferior",
      especialidad: "Tren Inferior",
      personalizado: true,
      hasIntroAudio: false,
      hasVoice: false,
      frase: "Fuerza en tren inferior.",
    };
    const coreCoach = {
      id: "core",
      nombre: 'Mateo "Pulse" Vega',
      emoji: "◎",
      titulo: "Especialista en Core",
      especialidad: "Core y Recomposición",
      personalizado: true,
      hasIntroAudio: false,
      hasVoice: false,
      frase: "Control abdominal y recomposición.",
    };
    const temachCoach = {
      id: "temach",
      nombre: "El Temach",
      emoji: "🪖",
      titulo: "Comandante del Modo Guerra",
      especialidad: "Disciplina y Fuerza",
      personalizado: false,
      hasIntroAudio: true,
      hasVoice: true,
      frase: "Cero excusas.",
    };

    const markdownReply = [
      "Resumen de tu progreso en tren superior:",
      "",
      "| Métrica | Valor |",
      "| --- | --- |",
      "| Asistencias | 2 |",
      "| Peso movido | 2,800 kg |",
      "",
      "Sigue aumentando 2.5 kg cuando completes 10 reps limpias.",
    ].join("\n");

    const coachSpy = {
      obtenerCoaches: jasmine
        .createSpy()
        .and.returnValue(of([torsoCoach, piernaCoach, coreCoach, temachCoach])),
      generarRutina: jasmine.createSpy(),
      enviarMensajeChat: jasmine.createSpy().and.returnValue(
        of({
          exito: true,
          coach: torsoCoach.nombre,
          respuesta: markdownReply,
        }),
      ),
      sintetizarVozCoach: jasmine.createSpy(),
      leerPreferenciaAutoVoz: jasmine.createSpy().and.returnValue(false),
      guardarPreferenciaAutoVoz: jasmine.createSpy(),
    };

    const playSpy = spyOn(HTMLAudioElement.prototype, "play").and.returnValue(
      Promise.resolve(),
    );
    spyOn(HTMLAudioElement.prototype, "pause").and.stub();

    TestBed.configureTestingModule({
      imports: [CoachIaComponent],
      providers: [
        provideRouter([]),
        { provide: RutinaService, useValue: coachSpy },
        {
          provide: SESSION,
          useValue: {
            getCurrentUser: () => Promise.resolve(null),
            userName$: of("Socio"),
            userRole$: of("subscriber"),
          },
        },
        {
          provide: PerfilSocioService,
          useValue: {
            perfil$: of({
              nombre: "Socio",
              edad: 25,
              peso: 76,
              altura: 176,
              genero: "Masculino",
              objetivo: "Ganancia muscular",
              diasDisponibles: 4,
              nivel: "Intermedio",
              restriccionesMedicas: "Ninguna",
            }),
            actualizarNombre: () => {},
          },
        },
        {
          provide: ACTIVITY,
          useValue: {
            historial$: of([
              {
                id: "a1",
                clase: "Funcional",
                fecha: "2026-11-20",
                turno: "08:00",
                estado: "Asistida",
              },
              {
                id: "a2",
                clase: "Fuerza",
                fecha: "2026-11-22",
                turno: "19:00",
                estado: "Asistida",
              },
              {
                id: "a3",
                clase: "Spinning",
                fecha: "2026-11-25",
                turno: "07:00",
                estado: "Reservada",
              },
            ]),
            workoutLogs$: of([
              {
                id: "w1",
                fecha: "2026-11-22",
                ejercicio: "Press inclinado",
                grupoMuscular: "Pecho",
                series: 4,
                repeticiones: 10,
                pesoKg: 70,
              },
            ]),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(CoachIaComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    expect(comp.coachesPersonalizados.length).toBe(3);
    expect(comp.coachesPersonajes.length).toBe(1);
    expect(comp.totalAsistencias).toBe(2);
    expect(comp.pesoTotalLevantadoKg).toBe(2800);
    expect(comp.pesoMaximoKg).toBe(70);

    comp.seleccionarCoach(torsoCoach, true);
    comp.abrirPestanaChat();
    fixture.detectChanges();

    expect(playSpy).not.toHaveBeenCalled();

    const pillsText =
      fixture.nativeElement.querySelector(".telemetry-pills")?.textContent ?? "";
    expect(pillsText).toContain("Asistencias: 2");
    expect(pillsText).toContain("2,800 kg");
    expect(pillsText).toContain("70 kg");

    const dataChipText =
      fixture.nativeElement.querySelector(".voice-chip--data")?.textContent ?? "";
    expect(dataChipText).toContain("Sin voz intro");

    comp.mensajeInput = "Analiza mi tren superior y asistencias";
    comp.enviarMensaje();
    fixture.detectChanges();

    const chatArgs = coachSpy.enviarMensajeChat.calls.mostRecent().args;
    expect(chatArgs[0]).toBe("torso");
    expect(chatArgs[5]?.userTelemetry?.asistencia?.totalAsistencias).toBe(2);
    expect(chatArgs[5]?.userTelemetry?.recuentoPeso?.pesoTotalLevantadoKg).toBe(
      2800,
    );
    expect(chatArgs[5]?.userTelemetry?.recuentoPeso?.ejercicioRecord).toBe(
      "Press inclinado",
    );

    expect(comp.mensajes.length).toBe(2);
    expect(comp.mensajes[1].hasVoice).toBeFalse();
    expect(fixture.nativeElement.querySelector(".btn-listen-coach")).toBeNull();
    expect(
      fixture.nativeElement.querySelector(".coach-markdown .table-wrap table tbody tr"),
    ).not.toBeNull();
  });
});
