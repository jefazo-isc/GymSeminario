import { TestBed } from "@angular/core/testing";
import { DialogRef } from "@angular/cdk/dialog";
import { provideRouter, Router } from "@angular/router";
import { SearchPanelComponent } from "./search-panel.component";

describe("SearchPanelComponent", () => {
  it("trims the query and preserves the existing search route contract", () => {
    const close = jasmine.createSpy("close");
    TestBed.configureTestingModule({
      imports: [SearchPanelComponent],
      providers: [
        provideRouter([]),
        { provide: DialogRef, useValue: { close } },
      ],
    });
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, "navigate").and.resolveTo(true);
    const fixture = TestBed.createComponent(SearchPanelComponent);
    fixture.componentInstance.search("   Yoga   ");
    expect(close).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(["/buscar"], {
      queryParams: { q: "Yoga" },
    });
  });

  it("does not navigate for an empty query", () => {
    TestBed.configureTestingModule({
      imports: [SearchPanelComponent],
      providers: [
        provideRouter([]),
        { provide: DialogRef, useValue: { close: jasmine.createSpy() } },
      ],
    });
    const navigate = spyOn(TestBed.inject(Router), "navigate").and.resolveTo(
      true,
    );
    TestBed.createComponent(SearchPanelComponent).componentInstance.search(
      "   ",
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
