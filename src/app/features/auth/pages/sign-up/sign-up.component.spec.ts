import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CaptchaController } from "../../../../core/auth/captcha-controller";
import { smokeDependencies } from "../../../../testing/smoke-dependencies";

import SignUpComponent from "./sign-up.component";

describe("SignUpComponent", () => {
  let component: SignUpComponent;
  let fixture: ComponentFixture<SignUpComponent>;

  beforeEach(async () => {
    spyOn(CaptchaController.prototype, "init").and.stub();
    await TestBed.configureTestingModule({
      providers: smokeDependencies(),
      imports: [SignUpComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SignUpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
