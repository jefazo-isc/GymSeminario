import { provideHttpClient } from "@angular/common/http";
import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { provideRouter, withInMemoryScrolling } from "@angular/router";
import { provideServiceWorker } from "@angular/service-worker";
import { routes } from "./app.routes";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: "enabled",
        anchorScrolling: "enabled",
      }),
    ),
    provideAnimationsAsync(),
    provideHttpClient(),
    provideServiceWorker("ngsw-worker.js", {
      enabled: false,
    }),
  ],
};
