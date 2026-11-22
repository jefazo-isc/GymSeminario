import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { ThemeService } from "../theme/theme.service";
import { CapacitorNativeService } from "./capacitor-native.service";

describe("CapacitorNativeService", () => {
  it("reports web platform safely and handles theme changes without errors", () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    const service = TestBed.inject(CapacitorNativeService);
    const theme = TestBed.inject(ThemeService);

    expect(service.isNative).toBeFalse();
    expect(service.platform).toBe("web");

    expect(() => {
      theme.setPreference("dark");
      theme.setPreference("light");
    }).not.toThrow();
  });
});
