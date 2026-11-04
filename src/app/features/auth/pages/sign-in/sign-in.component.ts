import { CommonModule } from "@angular/common";
import { Component, inject, NgZone, OnDestroy, OnInit, AfterViewInit, ElementRef, ViewChild, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { authErrorMessage } from "../../../../core/auth/auth-feedback";
import { CaptchaController } from "../../../../core/auth/captcha-controller";
import { PasswordToggleDirective } from "../../../../shared/directives/password-toggle.directive";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { SESSION } from "../../data-access/session.repository";

const GOOGLE_CLIENT_ID = '366321485374-143tbv091m8a3r6ajps5jsodpj9aeah0.apps.googleusercontent.com';

@Component({
  selector: "app-sign-in",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PasswordToggleDirective,
    ButtonDirective,
    IconComponent,
  ],
  templateUrl: "./sign-in.component.html",
  styleUrl: "./sign-in.component.css",
})
export default class SignInComponent implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private service = inject(SESSION);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('googleBtn') googleBtnRef!: ElementRef<HTMLDivElement>;

  readonly captcha = new CaptchaController(this.service.auth, "sign-in-recaptcha");
  busy: "email" | "google" | "phone" | null = null;
  message = "";

  readonly form = this.fb.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", Validators.required],
  });

  ngOnInit() {
    this.captcha.init();
  }

  ngAfterViewInit() {
    this.initGoogleAuth();
  }

  ngOnDestroy() {
    this.captcha.destroy();
  }

  private initGoogleAuth() {
    if (!isPlatformBrowser(this.platformId)) return;
    const checkGIS = () => {
      const g = (window as any).google?.accounts?.id;
      if (g && this.googleBtnRef?.nativeElement) {
        this.renderGoogleButton(g);
      } else {
        setTimeout(checkGIS, 150);
      }
    };
    checkGIS();
  }

  private renderGoogleButton(g: any) {
    if (!this.googleBtnRef?.nativeElement) return;
    this.googleBtnRef.nativeElement.innerHTML = '';

    g.initialize({
      client_id: GOOGLE_CLIENT_ID,
      auto_select: false,
      callback: (response: { credential: string }) => {
        this.ngZone.run(async () => {
          this.busy = 'google';
          this.message = '';
          try {
            const svc = this.service as any;
            await svc.signInWithGoogleCredential(response.credential);
            await this.router.navigate(['/home']);
          } catch (error) {
            this.message = authErrorMessage(error);
          } finally {
            this.busy = null;
          }
        });
      },
    });

    g.renderButton(this.googleBtnRef.nativeElement, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      width: 320,
      text: 'signin_with',
      locale: 'es',
    });
  }

  invalid(name: string) {
    const c = this.form.get(name);
    return !!(c?.invalid && c.touched);
  }

  async submit() {
    if (this.busy) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy = "email";
    this.message = "";
    try {
      const { email, password } = this.form.getRawValue();
      await this.service.signIn({ email: email.trim(), password });
      await this.router.navigate(["/home"]);
    } catch (error) {
      this.message = authErrorMessage(error);
    } finally {
      this.busy = null;
    }
  }
}

