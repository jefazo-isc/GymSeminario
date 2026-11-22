import { Location } from "@angular/common";
import { DestroyRef, Injectable, effect, inject } from "@angular/core";
import { Router } from "@angular/router";
import { App } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Subject } from "rxjs";
import { ThemeService } from "../theme/theme.service";

/**
 * Integrates native Capacitor capabilities (status bar theming, hardware back button,
 * haptic feedback, and splash screen lifecycle) when running inside the Android container or mobile web.
 */
@Injectable({ providedIn: "root" })
export class CapacitorNativeService {
  readonly isNative = Capacitor.isNativePlatform();
  readonly platform = Capacitor.getPlatform();

  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);

  private readonly modalCloseHandlers: (() => boolean)[] = [];
  private readonly openDrawerRequested = new Subject<void>();
  readonly openDrawer$ = this.openDrawerRequested.asObservable();

  constructor() {
    if (!this.isNative) {
      return;
    }

    void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined);

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
        // 1. Cerrar primero cualquier modal, dialog o drawer abierto
        for (let i = this.modalCloseHandlers.length - 1; i >= 0; i--) {
          try {
            if (this.modalCloseHandlers[i]()) {
              return; // Consumido por el modal/drawer
            }
          } catch {
            // continuar
          }
        }

        // 2. Navegar hacia atrás si no está en la raíz
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

  /**
   * Registra un manejador para cerrar modales o menús al pulsar el botón Atrás de Android.
   * Debe retornar true si consumió la acción.
   */
  registerModalCloseHandler(handler: () => boolean): () => void {
    this.modalCloseHandlers.push(handler);
    return () => {
      const idx = this.modalCloseHandlers.indexOf(handler);
      if (idx !== -1) {
        this.modalCloseHandlers.splice(idx, 1);
      }
    };
  }

  /**
   * Solicita abrir el menú lateral desde la barra de navegación inferior.
   */
  requestOpenDrawer(): void {
    this.openDrawerRequested.next();
  }

  /**
   * Genera una vibración táctil háptica sutil para confirmaciones móviles.
   */
  hapticFeedback(type: "light" | "medium" | "success" | "warning" = "light"): void {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        if (type === "light") {
          navigator.vibrate(12);
        } else if (type === "medium") {
          navigator.vibrate(25);
        } else if (type === "success") {
          navigator.vibrate([12, 40, 18]);
        } else if (type === "warning") {
          navigator.vibrate([25, 40, 25]);
        }
      }
    } catch {
      // Fallback seguro
    }
  }
}
