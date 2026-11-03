import { CommonModule } from "@angular/common";
import { Component, inject, OnDestroy, OnInit, AfterViewInit, ElementRef, ViewChild, PLATFORM_ID } from "@angular/core";
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
    this.loadGoogleGIS();
  }

  ngAfterViewInit() {
    this.renderGoogleButton();
  }

  ngOnDestroy() {
    this.captcha.destroy();
  }

  private loadGoogleGIS() {
    if (!isPlatformBrowser(this.platformId)) return;
    if ((window as any).google?.accounts?.id) {
      this.renderGoogleButton();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.renderGoogleButton();
    document.head.appendChild(script);
  }

  private renderGoogleButton() {
    if (!isPlatformBrowser(this.platformId)) return;
    const g = (window as any).google?.accounts?.id;
    if (!g || !this.googleBtnRef?.nativeElement) return;

    g.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: { credential: string }) => {
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
      },
      cancel_on_tap_outside: true,
    });

    g.renderButton(this.googleBtnRef.nativeElement, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      width: '100%',
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

