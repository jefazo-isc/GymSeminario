import { Capacitor } from "@capacitor/core";

/**
 * Determina si la aplicación se está ejecutando en la versión móvil:
 * 1. Como aplicación nativa Capacitor en Android o iOS (ej. Xiaomi por USB / APK instalado).
 * 2. Como PWA instalada en modo standalone o WebView embebido.
 * 3. En navegador móvil (Android / iPhone / iPad / etc.).
 */
export function isMobileVersion(): boolean {
  try {
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    if (typeof window !== "undefined") {
      if (
        window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches
      ) {
        return true;
      }
      const ua =
        (typeof navigator !== "undefined" ? navigator.userAgent : "") || "";
      if (/android|iphone|ipad|ipod|mobile|wv/i.test(ua)) {
        return true;
      }
    }
  } catch {
    /* fallback seguro para SSR o entornos de testing */
  }
  return false;
}
