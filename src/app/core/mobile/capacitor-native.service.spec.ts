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

  it("handles modal close registration and unregistration", () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    const service = TestBed.inject(CapacitorNativeService);
    let closed = false;
    const unregister = service.registerModalCloseHandler(() => {
      closed = true;
      return true;
    });

    expect(typeof unregister).toBe("function");
    unregister();
  });

  it("emits open drawer requests to subscribers", (done) => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    const service = TestBed.inject(CapacitorNativeService);

    service.openDrawer$.subscribe(() => {
      expect(true).toBeTrue();
      done();
    });

    service.requestOpenDrawer();
  });

  it("triggers haptic feedback safely without throwing", () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    const service = TestBed.inject(CapacitorNativeService);

    expect(() => {
      service.hapticFeedback("light");
      service.hapticFeedback("success");
    }).not.toThrow();
  });
});
