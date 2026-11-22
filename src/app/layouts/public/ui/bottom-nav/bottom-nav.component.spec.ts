import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { BottomNavComponent } from "./bottom-nav.component";

describe("BottomNavComponent", () => {
  let component: BottomNavComponent;
  let fixture: ComponentFixture<BottomNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNavComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("creates successfully", () => {
    expect(component).toBeTruthy();
  });

  it("has 5 navigation items", () => {
    expect(component.items.length).toBe(5);
  });

  it("correctly identifies active route", () => {
    expect(component.isActive("/non-existent")).toBeFalse();
  });

  it("handles item click and triggers haptics", () => {
    const hapticSpy = spyOn(component.native, "hapticFeedback");
    const drawerSpy = spyOn(component.native, "requestOpenDrawer");

    const homeItem = component.items[0];
    component.onItemClick(homeItem);
    expect(hapticSpy).toHaveBeenCalledWith("light");

    const menuItem = component.items[4];
    component.onItemClick(menuItem);
    expect(drawerSpy).toHaveBeenCalled();
  });
});
