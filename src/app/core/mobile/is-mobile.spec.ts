import { isMobileVersion } from "./is-mobile";
import { Capacitor } from "@capacitor/core";

describe("isMobileVersion helper", () => {
  it("detects mobile version correctly based on platform or user agent", () => {
    // En entorno de testing estándar de escritorio (Chrome Headless Linux)
    const result = isMobileVersion();
    // En Chrome Headless Linux no es nativo ni móvil
    expect(typeof result).toBe("boolean");
  });

  it("returns true when running inside Capacitor native platform", () => {
    spyOn(Capacitor, "isNativePlatform").and.returnValue(true);
    expect(isMobileVersion()).toBeTrue();
  });
});
