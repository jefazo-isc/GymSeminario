import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import {
  EjerciciosComponent,
  normalizeSearch,
} from "../../features/training/pages/ejercicios/ejercicios.component";
import { VideoCardsComponent } from "../../features/training/pages/video-cards/video-cards.component";

describe("Exercise library", () => {
  const url = "https://arl150.github.io/ejercicios-api/ejercicios.json";
  const catalog = {
    datosPorParte: [
      {
        parte: "Pecho",
        ejercicios: [
          {
            nombre: "Flexión de pecho",
            series: 3,
            repeticiones: 12,
            equipo: "Ninguno",
          },
          {
            nombre: "Press",
            series: 4,
            repeticiones: 10,
            equipo: "Banca, barra",
          },
        ],
      },
      {
        parte: "Espalda",
        ejercicios: [
          { nombre: "Remo", series: 3, repeticiones: 12, equipo: "Barra" },
        ],
      },
    ],
  };
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [EjerciciosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function create() {
    const fixture = TestBed.createComponent(EjerciciosComponent);
    fixture.detectChanges();
    return fixture;
  }
  it("combines name, group and equipment without altering the source catalog", () => {
    const fixture = create();
    TestBed.inject(HttpTestingController).expectOne(url).flush(catalog);
    const component = fixture.componentInstance;
    component.filtroActual = "press";
    component.grupoFiltro = "Pecho";
    component.equipoFiltro = "barra";
    component.applyFilters();
    expect(component.total).toBe(1);
    expect(component.datosPorParte[0].ejercicios.length).toBe(2);
    component.reset();
    expect(component.total).toBe(3);
    expect(
      component.equipos.filter((value) => normalizeSearch(value) === "barra"),
    ).toEqual(["Barra"]);
    component.equipoFiltro = "BARRA";
    component.applyFilters();
    expect(component.total).toBe(2);
  });
  it("handles accents and treats punctuation as plain search text", () => {
    const fixture = create();
    TestBed.inject(HttpTestingController).expectOne(url).flush(catalog);
    fixture.componentInstance.onFiltrarEjercicios("FLEXION");
    expect(fixture.componentInstance.total).toBe(1);
    expect(() =>
      fixture.componentInstance.onFiltrarEjercicios("[("),
    ).not.toThrow();
    expect(fixture.componentInstance.total).toBe(0);
    expect(normalizeSearch("  FLEXIÓN ")).toBe("flexion");
  });
  it("offers retry after an actual HTTP failure and never invents exercises", () => {
    const fixture = create();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(url).flush(null, { status: 503, statusText: "Unavailable" });
    fixture.detectChanges();
    expect(fixture.componentInstance.total).toBe(0);
    expect(fixture.nativeElement.textContent).toContain(
      "catálogo no está disponible",
    );
    fixture.componentInstance.load();
    http.expectOne(url).flush(catalog);
    expect(fixture.componentInstance.error).toBe("");
    expect(fixture.componentInstance.total).toBe(3);
  });
  it("offers native keyboard-operable collapsible groups and a mobile representation", () => {
    const fixture = create();
    TestBed.inject(HttpTestingController).expectOne(url).flush(catalog);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelectorAll("details summary").length,
    ).toBe(2);
    expect(
      fixture.nativeElement.querySelectorAll(".exercise-cards article").length,
    ).toBe(3);
    expect(fixture.nativeElement.querySelector("details").open).toBeTrue();
  });
});

describe("Video guides", () => {
  it("loads no player until chosen, uses the correct embed URL and never requests autoplay", () => {
    TestBed.configureTestingModule({ imports: [VideoCardsComponent] });
    const fixture = TestBed.createComponent(VideoCardsComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll("iframe").length).toBe(0);
    expect(
      fixture.nativeElement.querySelectorAll('img[loading="lazy"]').length,
    ).toBe(6);
    fixture.nativeElement.querySelector(".video-launch").click();
    fixture.detectChanges();
    const src = fixture.nativeElement.querySelector("iframe").src;
    expect(src).toBe("https://www.youtube.com/embed/UglCbW0bmEw");
    expect(src).not.toContain("autoplay");
    fixture.componentInstance.selectFilter("Pecho");
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll("iframe").length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll(".video-card").length).toBe(
      1,
    );
  });
  it("keeps the existing muscle-selection input useful for embedded views", () => {
    TestBed.configureTestingModule({ imports: [VideoCardsComponent] });
    const fixture = TestBed.createComponent(VideoCardsComponent);
    fixture.componentRef.setInput("parte", "Piernas");
    fixture.detectChanges();
    expect(fixture.componentInstance.visible[0].id).toBe("nHtypUjIB-A");
  });
});
