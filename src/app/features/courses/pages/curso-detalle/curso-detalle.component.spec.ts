import { ComponentFixture, TestBed } from "@angular/core/testing";
import { smokeDependencies } from "../../../../testing/smoke-dependencies";

import { CursoDetalleComponent } from "./curso-detalle.component";

describe("CursoDetalleComponent", () => {
  let component: CursoDetalleComponent;
  let fixture: ComponentFixture<CursoDetalleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: smokeDependencies(),
      imports: [CursoDetalleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CursoDetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
