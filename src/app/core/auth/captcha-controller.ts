import { signal } from "@angular/core";
import { Auth } from "@angular/fire/auth";
import { RecaptchaVerifier } from "firebase/auth";

/** UI lifecycle only. Firebase still verifies every challenge. */
export class CaptchaController {
  readonly resolved = signal(false);
  readonly ready = signal(false);
  readonly error = signal("");
  private verifier?: RecaptchaVerifier;
  private generation = 0;
  constructor(
    private auth: Auth,
    private containerId: string,
  ) {}
  get instance() {
    return this.verifier;
  }
  init(): void {
    this.destroy();
    this.error.set("");
    this.ready.set(false);
    this.resolved.set(false);
    const generation = this.generation;
    const fail = () => {
      if (generation !== this.generation) return;
      this.ready.set(false);
      this.resolved.set(false);
      this.error.set(
        "No se pudo cargar la verificación. Revisa tu conexión y vuelve a cargar el CAPTCHA.",
      );
    };
    try {
      const holder = document.getElementById(this.containerId);
      if (!holder) {
        fail();
        return;
      }
      holder.replaceChildren();
      this.verifier = new RecaptchaVerifier(this.auth, this.containerId, {
        size: "compact",
        callback: () => {
          if (generation === this.generation) {
            this.resolved.set(true);
            this.error.set("");
          }
        },
        "expired-callback": () => {
          if (generation === this.generation) {
            this.resolved.set(false);
            this.error.set(
              "La verificación expiró. Completa nuevamente el CAPTCHA.",
            );
          }
        },
        "error-callback": fail,
      });
      this.verifier
        .render()
        .then(() => {
          if (generation === this.generation) this.ready.set(true);
        })
        .catch(fail);
    } catch {
      fail();
    }
  }
  destroy() {
    this.generation++;
    try {
      this.verifier?.clear();
    } catch {
      /* A detached widget can already be cleared. */
    }
    this.verifier = undefined;
    this.resolved.set(false);
  }
}
