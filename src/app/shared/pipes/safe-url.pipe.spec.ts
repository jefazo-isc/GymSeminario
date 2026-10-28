import { SecurityContext } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { DomSanitizer } from "@angular/platform-browser";
import { SafeUrlPipe } from "./safe-url.pipe";
describe("Video resource URLs", () => {
  it("accepts only a YouTube ID and builds the fixed player origin", () => {
    const sanitizer = TestBed.inject(DomSanitizer);
    const pipe = new SafeUrlPipe(sanitizer);
    expect(
      sanitizer.sanitize(
        SecurityContext.RESOURCE_URL,
        pipe.transform("UglCbW0bmEw"),
      ),
    ).toBe("https://www.youtube.com/embed/UglCbW0bmEw");
    expect(() => pipe.transform("https://example.test/")).toThrow();
    expect(() => pipe.transform("javascript:alert(1)")).toThrow();
  });
});
