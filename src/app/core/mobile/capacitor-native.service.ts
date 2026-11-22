import { Location } from "@angular/common";
import { DestroyRef, Injectable, effect, inject } from "@angular/core";
import { Router } from "@angular/router";
import { App } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { ThemeService } from "../theme/theme.service";

/**
 * Integrates native Capacitor capabilities (status bar theming, hardware back button,
 * and splash screen lifecycle) when running inside the Android container.
 */
@Injectable({ providedIn: "root" })
export class CapacitorNativeService {
  readonly isNative = Capacitor.isNativePlatform();
  readonly platform = Capacitor.getPlatform();

  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    if (!this.isNative) {
      return;
    }

    effect(() => {
      const effectiveTheme = this.theme.effective();
      const isDark = effectiveTheme === "dark";
      const backgroundColor = isDark ? "#101214" : "#f7f7f5";
      const style = isDark ? Style.Dark : Style.Light;

      void StatusBar.setStyle({ style }).catch(() => undefined);
      void StatusBar.setBackgroundColor({ color: backgroundColor }).catch(
        () => undefined,
      );
    });

    const backButtonHandle: Promise<PluginListenerHandle> = App.addListener(
      "backButton",
      ({ canGoBack }) => {
        const atRoot = this.router.url === "/" || this.router.url === "/home";
        if (canGoBack && !atRoot) {
          this.location.back();
        } else {
          void App.exitApp();
        }
      },
    );

    this.destroyRef.onDestroy(() => {
      void backButtonHandle.then((handle) => handle.remove()).catch(() => undefined);
    });

    void SplashScreen.hide().catch(() => undefined);
  }
}
