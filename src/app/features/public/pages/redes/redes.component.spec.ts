import { ComponentFixture, TestBed } from "@angular/core/testing";
import { smokeDependencies } from "../../../../testing/smoke-dependencies";

import { RedesComponent } from "./redes.component";

describe("RedesComponent", () => {
  let component: RedesComponent;
  let fixture: ComponentFixture<RedesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: smokeDependencies(),
      imports: [RedesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RedesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
