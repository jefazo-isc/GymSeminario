import { DOCUMENT, isPlatformBrowser } from "@angular/common";
import {
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from "@angular/core";

export type ThemePreference = "light" | "dark" | "system";
export type EffectiveTheme = "light" | "dark";
export const THEME_STORAGE_KEY = "grom.theme";

export function validTheme(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

@Injectable({ providedIn: "root" })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private readonly preferenceState = signal<ThemePreference>("system");
  private readonly effectiveState = signal<EffectiveTheme>("light");
  private media?: MediaQueryList;

  readonly preference = this.preferenceState.asReadonly();
  readonly effective = this.effectiveState.asReadonly();
  readonly label = computed(
    () =>
      ({ light: "Claro", dark: "Oscuro", system: "Sistema" })[
        this.preference()
      ],
  );

  constructor() {
    if (!this.browser) return;
    const view = this.document.defaultView;
    this.media = view?.matchMedia?.("(prefers-color-scheme: dark)");
    let preference: ThemePreference = "system";
    try {
      const stored = view?.localStorage.getItem(THEME_STORAGE_KEY);
      if (validTheme(stored)) preference = stored;
    } catch {
      /* Use the system preference without persistent storage. */
    }
    this.preferenceState.set(preference);
    this.apply();
    const changed = () => {
      if (this.preference() === "system") this.apply();
    };
    this.media?.addEventListener("change", changed);
    this.destroyRef.onDestroy(() =>
      this.media?.removeEventListener("change", changed),
    );
  }

  setPreference(preference: ThemePreference): void {
    if (!validTheme(preference)) return;
    this.preferenceState.set(preference);
    if (this.browser) {
      try {
        this.document.defaultView?.localStorage.setItem(
          THEME_STORAGE_KEY,
          preference,
        );
      } catch {
        /* The preference remains active for this visit. */
      }
    }
    this.apply();
  }

  private apply(): void {
    const theme =
      this.preference() === "system"
        ? this.media?.matches
          ? "dark"
          : "light"
        : (this.preference() as EffectiveTheme);
    this.effectiveState.set(theme);
    const root = this.document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-theme-preference", this.preference());
    root.style.colorScheme = theme;
    this.document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#101214" : "#f7f7f5");
  }
}
