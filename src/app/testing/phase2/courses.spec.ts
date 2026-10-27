import { TestBed } from "@angular/core/testing";
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  Router,
} from "@angular/router";
import { BehaviorSubject } from "rxjs";
import { BuscarComponent } from "../../components/buscar/buscar.component";
import { CursoDetalleComponent } from "../../components/curso-detalle/curso-detalle.component";

describe("Course navigation", () => {
  it("keeps query changes and clears search through the existing route", () => {
    const params = new BehaviorSubject(convertToParamMap({ q: "Yoga" }));
    TestBed.configureTestingModule({
      imports: [BuscarComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      ],
    });
    const navigate = spyOn(TestBed.inject(Router), "navigate").and.resolveTo(
      true,
    );
    const component =
      TestBed.createComponent(BuscarComponent).componentInstance;
    expect(component.resultados.length).toBe(3);
    params.next(convertToParamMap({ q: "no-unit-course" }));
    expect(component.resultados.length).toBe(0);
    component.clear();
    expect(navigate).toHaveBeenCalledWith(["/buscar"], { queryParams: {} });
  });
  it("refreshes the course when its route parameter changes and handles missing IDs", () => {
    const params = new BehaviorSubject(convertToParamMap({ id: "1" }));
    TestBed.configureTestingModule({
      imports: [CursoDetalleComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
      ],
    });
    const fixture = TestBed.createComponent(CursoDetalleComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.curso?.nombre).toBe("Pilates Básico");
    params.next(convertToParamMap({ id: "4" }));
    expect(fixture.componentInstance.curso?.nombre).toBe("Yoga Relax");
    params.next(convertToParamMap({ id: "99999" }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      "no está en el catálogo",
    );
  });
});
