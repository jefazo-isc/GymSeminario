import { signal } from "@angular/core";

/**
 * Stub de CaptchaController — el ReCAPTCHA de Firebase ya no se usa.
 * Mantiene la misma interfaz para que los componentes no cambien.
 */
export class CaptchaController {
  readonly resolved = signal(true); // siempre resuelto
  readonly ready = signal(true);
  readonly error = signal("");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(..._args: unknown[]) {}

  get instance() { return undefined; }
  init(): void { this.resolved.set(true); this.ready.set(true); }
  destroy(): void { /* noop */ }
}
