import { DOCUMENT, isPlatformBrowser } from "@angular/common";
import {
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  inject,
  signal,
} from "@angular/core";
import { NavigationStart, Router } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { filter } from "rxjs";

@Injectable({ providedIn: "root" })
export class AccessibilityService {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  readonly scale = signal(1);
  readonly moreContrast = signal(false);
  readonly reducedMotion = signal(false);
  readonly reading = signal<"stopped" | "reading" | "paused">("stopped");
  readonly readingMessage = signal(
    "La lectura está disponible en Nosotros y Servicios.",
  );
  private utterance?: SpeechSynthesisUtterance;

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.stop());
    this.destroyRef.onDestroy(() => this.stop());
  }

  get speechAvailable(): boolean {
    return this.browser && Boolean(this.document.defaultView?.speechSynthesis);
  }

  changeScale(delta: number): void {
    this.scale.set(
      Math.max(1, Math.min(1.25, Number((this.scale() + delta).toFixed(3)))),
    );
    this.document.documentElement.style.setProperty(
      "--reading-scale",
      String(this.scale()),
    );
  }

  toggleContrast(): void {
    this.moreContrast.update((value) => !value);
    this.document.documentElement.setAttribute(
      "data-contrast",
      this.moreContrast() ? "more" : "normal",
    );
  }

  toggleMotion(): void {
    this.reducedMotion.update((value) => !value);
    this.document.documentElement.setAttribute(
      "data-motion",
      this.reducedMotion() ? "reduce" : "system",
    );
  }

  read(): void {
    const view = this.document.defaultView;
    if (!this.speechAvailable || !view) return;
    const synth = view.speechSynthesis;
    if (this.reading() === "paused") {
      synth.resume();
      this.reading.set("reading");
      return;
    }
    const sections = this.document.querySelectorAll(
      "#contenido-lector-nosotros, #contenido-lector-servicios",
    );
    const text = Array.from(sections)
      .map((section) => section.textContent?.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(". ");
    if (!text) {
      this.readingMessage.set(
        "Abre Nosotros o Servicios para escuchar su contenido.",
      );
      return;
    }
    synth.cancel();
    const Utterance = (
      view as Window & {
        SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance;
      }
    ).SpeechSynthesisUtterance;
    this.utterance = new Utterance(text);
    this.utterance.lang = "es-MX";
    this.utterance.onend = () => {
      this.reading.set("stopped");
      this.readingMessage.set("Lectura finalizada.");
    };
    this.utterance.onerror = () => {
      this.reading.set("stopped");
      this.readingMessage.set(
        "La lectura se detuvo. Puedes volver a intentarlo.",
      );
    };
    this.readingMessage.set("Leyendo la información del gimnasio.");
    this.reading.set("reading");
    synth.speak(this.utterance);
  }

  pause(): void {
    this.document.defaultView?.speechSynthesis?.pause();
    this.reading.set("paused");
  }
  stop(): void {
    if (this.utterance) {
      this.utterance.onend = null;
      this.utterance.onerror = null;
    }
    if (this.browser) this.document.defaultView?.speechSynthesis?.cancel();
    this.reading.set("stopped");
  }
  reset(): void {
    this.scale.set(1);
    this.moreContrast.set(false);
    this.reducedMotion.set(false);
    this.stop();
    const root = this.document.documentElement;
    root.style.removeProperty("--reading-scale");
    root.removeAttribute("data-contrast");
    root.removeAttribute("data-motion");
  }
}
