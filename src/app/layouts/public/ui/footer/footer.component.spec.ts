import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { FooterComponent } from "./footer.component";

describe("FooterComponent", () => {
  it("keeps useful route links and protects external windows", () => {
    TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('a[href="/membresias"]')).not.toBeNull();
    expect(host.querySelector('a[href^="tel:"]')).not.toBeNull();
    for (const link of Array.from(
      host.querySelectorAll('a[target="_blank"]'),
    )) {
      expect(link.getAttribute("rel")).toContain("noopener");
    }
  });
});
