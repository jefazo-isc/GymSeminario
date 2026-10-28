import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, throwError } from "rxjs";
import { AuthService } from "../../features/auth/data-access/auth.service";
import { RutinaService } from "../../features/coach/data-access/rutina.service";
import {
  CoachIaComponent,
  validRoutine,
} from "../../features/coach/pages/coach-ia/coach-ia.component";
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
