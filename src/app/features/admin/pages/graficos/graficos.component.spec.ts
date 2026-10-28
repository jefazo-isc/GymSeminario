import { ComponentFixture, TestBed } from "@angular/core/testing";
import { smokeDependencies } from "../../../../testing/smoke-dependencies";

import { GraficosComponent } from "./graficos.component";

describe("GraficosComponent", () => {
  let component: GraficosComponent;
  let fixture: ComponentFixture<GraficosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: smokeDependencies(),
      imports: [GraficosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GraficosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
