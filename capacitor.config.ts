import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "mx.uaa.espaciogym.grom21",
  appName: "GROM 21 espacioGYM",
  webDir: "dist/libreria1/browser",
  server: {
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#f7f7f5",
    allowMixedContent: false,
  },
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "284503632870-hup11ff07or46r457spa5bj42nr26rdt.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#f7f7f5",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#f7f7f5",
      overlaysWebView: false,
    },
  },
};

export default config;
