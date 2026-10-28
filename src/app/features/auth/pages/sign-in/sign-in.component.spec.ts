import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CaptchaController } from "../../../../core/auth/captcha-controller";
import { smokeDependencies } from "../../../../testing/smoke-dependencies";

import SignInComponent from "./sign-in.component";

describe("SignInComponent", () => {
  let component: SignInComponent;
  let fixture: ComponentFixture<SignInComponent>;

  beforeEach(async () => {
    spyOn(CaptchaController.prototype, "init").and.stub();
    await TestBed.configureTestingModule({
      providers: smokeDependencies(),
      imports: [SignInComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SignInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
