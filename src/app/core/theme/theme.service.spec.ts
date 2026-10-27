import { DOCUMENT } from "@angular/common";
import { PLATFORM_ID } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { THEME_STORAGE_KEY, ThemeService, validTheme } from "./theme.service";

describe("ThemeService", () => {
  let doc: Document;
  let storage: jasmine.SpyObj<Storage>;
  let media: {
    matches: boolean;
    addEventListener: jasmine.Spy;
    removeEventListener: jasmine.Spy;
  };
  let listener: () => void;

  function create(
    stored: string | null = null,
    dark = false,
    platform = "browser",
  ): ThemeService {
    doc = document.implementation.createHTMLDocument("Theme test");
    storage = jasmine.createSpyObj<Storage>("Storage", ["getItem", "setItem"]);
    storage.getItem.and.returnValue(stored);
    media = {
      matches: dark,
      addEventListener: jasmine.createSpy(),
      removeEventListener: jasmine.createSpy(),
    };
    media.addEventListener.and.callFake(
      (_event, callback) => (listener = callback),
    );
    Object.defineProperty(doc, "defaultView", {
      value: { localStorage: storage, matchMedia: () => media },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: doc },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    return TestBed.inject(ThemeService);
  }

  it("uses the system when no valid preference exists", () => {
    const theme = create("invalid", true);
    expect(theme.preference()).toBe("system");
    expect(theme.effective()).toBe("dark");
    expect(doc.documentElement.dataset["theme"]).toBe("dark");
  });

  it("keeps a saved explicit preference independent of the system", () => {
    const theme = create("light", true);
    listener();
    expect(theme.preference()).toBe("light");
    expect(theme.effective()).toBe("light");
  });

  it("reacts to system changes only in automatic mode", () => {
    const theme = create(null, false);
    media.matches = true;
    listener();
    expect(theme.effective()).toBe("dark");
    theme.setPreference("light");
    listener();
    expect(theme.effective()).toBe("light");
    theme.setPreference("system");
    expect(theme.effective()).toBe("dark");
  });

  it("persists the preference rather than the resolved system color", () => {
    const theme = create();
    theme.setPreference("system");
    expect(storage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "system");
    theme.setPreference("dark");
    expect(doc.documentElement.style.colorScheme).toBe("dark");
    expect(theme.label()).toBe("Oscuro");
  });

  it("continues when reading or writing storage is blocked", () => {
    const theme = create();
    storage.setItem.and.throwError("blocked");
    expect(() => theme.setPreference("dark")).not.toThrow();
    expect(theme.effective()).toBe("dark");
    TestBed.resetTestingModule();
    storage.getItem.and.throwError("blocked");
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: doc }],
    });
    expect(TestBed.inject(ThemeService).preference()).toBe("system");
  });

  it("does not access browser APIs during server rendering", () => {
    const theme = create("dark", true, "server");
    expect(theme.preference()).toBe("system");
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(media.addEventListener).not.toHaveBeenCalled();
  });

  it("removes the system listener on destruction", () => {
    create();
    TestBed.resetTestingModule();
    expect(media.removeEventListener).toHaveBeenCalledWith("change", listener);
  });

  it("accepts only the three public preferences", () => {
    expect(["light", "dark", "system"].every(validTheme)).toBeTrue();
    expect(validTheme("automatic")).toBeFalse();
    const theme = create();
    theme.setPreference("invalid" as never);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
