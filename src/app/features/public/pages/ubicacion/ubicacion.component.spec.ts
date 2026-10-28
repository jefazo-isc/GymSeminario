import { ComponentFixture, TestBed } from "@angular/core/testing";
import { smokeDependencies } from "../../../../testing/smoke-dependencies";

import { UbicacionComponent } from "./ubicacion.component";

describe("UbicacionComponent", () => {
  let component: UbicacionComponent;
  let fixture: ComponentFixture<UbicacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: smokeDependencies(),
      imports: [UbicacionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UbicacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
