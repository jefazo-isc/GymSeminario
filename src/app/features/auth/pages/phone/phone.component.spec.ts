import { ComponentFixture, TestBed } from "@angular/core/testing";
import { smokeDependencies } from "../../../../testing/smoke-dependencies";

import { PhoneComponent } from "./phone.component";

describe("PhoneComponent", () => {
  let component: PhoneComponent;
  let fixture: ComponentFixture<PhoneComponent>;

  beforeEach(async () => {
    spyOn(PhoneComponent.prototype, "ngOnInit").and.stub();
    await TestBed.configureTestingModule({
      providers: smokeDependencies(),
      imports: [PhoneComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PhoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
