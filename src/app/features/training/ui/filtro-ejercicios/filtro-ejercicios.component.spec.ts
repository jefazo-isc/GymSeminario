import { ComponentFixture, TestBed } from "@angular/core/testing";
import { smokeDependencies } from "../../../../testing/smoke-dependencies";

import { FiltroEjerciciosComponent } from "./filtro-ejercicios.component";

describe("FiltroEjerciciosComponent", () => {
  let component: FiltroEjerciciosComponent;
  let fixture: ComponentFixture<FiltroEjerciciosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: smokeDependencies(),
      imports: [FiltroEjerciciosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FiltroEjerciciosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
