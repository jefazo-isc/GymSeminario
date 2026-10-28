import { ComponentFixture, TestBed } from "@angular/core/testing";
import { smokeDependencies } from "../../../../testing/smoke-dependencies";

import { QrViewComponent } from "./qr-view.component";

describe("QrViewComponent", () => {
  let component: QrViewComponent;
  let fixture: ComponentFixture<QrViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: smokeDependencies(),
      imports: [QrViewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QrViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
