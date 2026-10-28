import { ComponentFixture, TestBed } from "@angular/core/testing";
import { smokeDependencies } from "../../../../testing/smoke-dependencies";

import { ChangeComponent } from "./change.component";

describe("ChangeComponent", () => {
  let component: ChangeComponent;
  let fixture: ComponentFixture<ChangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: smokeDependencies(),
      imports: [ChangeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
