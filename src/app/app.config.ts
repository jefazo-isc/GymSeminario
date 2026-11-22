import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { ApplicationConfig, isDevMode, provideZoneChangeDetection } from "@angular/core";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { provideRouter, withInMemoryScrolling, withNavigationErrorHandler } from "@angular/router";
import { provideServiceWorker } from "@angular/service-worker";
import { Capacitor } from "@capacitor/core";
import { routes } from "./app.routes";
import { authInterceptor } from "./core/auth/auth.interceptor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: "enabled",
        anchorScrolling: "enabled",
      }),
      withNavigationErrorHandler((NavigationError) => {
        const msg = String(NavigationError?.error || "");
        if (
          typeof window !== "undefined" &&
          (msg.includes("dynamically imported module") ||
            msg.includes("Importing a module script failed") ||
            msg.includes("ChunkLoadError"))
        ) {
          const key = "grom_chunk_reload_ts";
          const last = Number(sessionStorage.getItem(key) || "0");
          if (Date.now() - last > 10000) {
            sessionStorage.setItem(key, String(Date.now()));
            if ("serviceWorker" in navigator) {
              navigator.serviceWorker
                .getRegistrations()
                .then((regs) => Promise.all(regs.map((r) => r.unregister())))
                .finally(() => window.location.reload());
            } else {
              window.location.reload();
            }
          }
        }
      }),
    ),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideServiceWorker("ngsw-worker.js", {
      enabled: !isDevMode() && !Capacitor.isNativePlatform(),
      registrationStrategy: "registerWhenStable:30000",
    }),
  ],
};
