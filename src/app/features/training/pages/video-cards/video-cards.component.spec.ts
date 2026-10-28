import { ComponentFixture, TestBed } from "@angular/core/testing";
import { smokeDependencies } from "../../../../testing/smoke-dependencies";

import { VideoCardsComponent } from "./video-cards.component";

describe("VideoCardsComponent", () => {
  let component: VideoCardsComponent;
  let fixture: ComponentFixture<VideoCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: smokeDependencies(),
      imports: [VideoCardsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VideoCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
