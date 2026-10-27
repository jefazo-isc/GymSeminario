import { DOCUMENT } from "@angular/common";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { AccessibilityService } from "./accessibility.service";
import { ThemeService } from "../theme/theme.service";

describe("AccessibilityService", () => {
  let doc: Document;
  beforeEach(() => {
    doc = document.implementation.createHTMLDocument("Accessibility test");
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: DOCUMENT, useValue: doc }],
    });
  });

  it("bounds reading size without changing alignment or container widths", () => {
    const service = TestBed.inject(AccessibilityService);
    service.changeScale(1);
    expect(service.scale()).toBe(1.25);
    service.changeScale(-2);
    expect(service.scale()).toBe(1);
    expect(doc.documentElement.style.getPropertyValue("--reading-scale")).toBe(
      "1",
    );
    expect(doc.body.style.textAlign).toBe("");
  });

  it("resets accessibility without resetting theme", () => {
    const theme = TestBed.inject(ThemeService);
    const service = TestBed.inject(AccessibilityService);
    theme.setPreference("dark");
    service.toggleContrast();
    service.toggleMotion();
    service.changeScale(0.125);
    expect(doc.documentElement.dataset["contrast"]).toBe("more");
    expect(doc.documentElement.dataset["motion"]).toBe("reduce");
    service.reset();
    expect(theme.preference()).toBe("dark");
    expect(doc.documentElement.dataset["theme"]).toBe("dark");
    expect(doc.documentElement.hasAttribute("data-contrast")).toBeFalse();
    expect(service.scale()).toBe(1);
  });

  it("tolerates a browser without speech synthesis", () => {
    const service = TestBed.inject(AccessibilityService);
    expect(service.speechAvailable).toBeFalse();
    expect(() => {
      service.read();
      service.stop();
    }).not.toThrow();
    expect(service.reading()).toBe("stopped");
  });
});
