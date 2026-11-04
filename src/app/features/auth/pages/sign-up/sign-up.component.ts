import { CommonModule } from "@angular/common";
import { Component, inject, NgZone, OnDestroy, OnInit, AfterViewInit, ElementRef, ViewChild, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ContraValidator } from "../../../../../validators/contra.validator";
import { matchContra } from "../../../../../validators/match-contra.validator";
import { authErrorMessage } from "../../../../core/auth/auth-feedback";
import { CaptchaController } from "../../../../core/auth/captcha-controller";
import { PasswordToggleDirective } from "../../../../shared/directives/password-toggle.directive";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { SESSION } from "../../data-access/session.repository";

const GOOGLE_CLIENT_ID = '366321485374-143tbv091m8a3r6ajps5jsodpj9aeah0.apps.googleusercontent.com';

interface GoogleIdentityServices {
  initialize(config: Record<string, unknown>): void;
  renderButton(element: HTMLElement, options: Record<string, unknown>): void;
}

@Component({
  selector: "app-sign-up",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PasswordToggleDirective,
    ButtonDirective,
    IconComponent,
  ],
  templateUrl: "./sign-up.component.html",
  styleUrl: "./sign-up.component.css",
})
export default class SignUpComponent implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private service = inject(SESSION);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('googleBtn') googleBtnRef!: ElementRef<HTMLDivElement>;

  readonly captcha = new CaptchaController(this.service.auth, "sign-up-recaptcha");
  busy: "email" | "google" | null = null;
  message = "";

  readonly form = this.fb.nonNullable.group(
    {
      nombre: ["", Validators.required],
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required, ContraValidator]],
      confirmPassword: ["", Validators.required],
    },
    { validators: matchContra("password", "confirmPassword") },
  );

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
    const win = window as unknown as { google?: { accounts?: { id?: GoogleIdentityServices } } };
    const checkGIS = () => {
      const g = win.google?.accounts?.id;
      if (g && this.googleBtnRef?.nativeElement) {
        this.renderGoogleButton(g);
      } else {
        setTimeout(checkGIS, 150);
      }
    };
    checkGIS();
  }

  private renderGoogleButton(g: GoogleIdentityServices) {
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
            await this.service.signInWithGoogleCredential(response.credential);
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
      text: 'signup_with',
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
      const { email, password, nombre } = this.form.getRawValue();
      if (!nombre.trim()) {
        this.form.controls.nombre.setErrors({ required: true });
        return;
      }
      await this.service.signUp({ email: email.trim(), password, nombre: nombre.trim() });
      await this.router.navigate(["/home"]);
    } catch (error) {
      this.message = authErrorMessage(error);
    } finally {
      this.busy = null;
    }
  }
}

