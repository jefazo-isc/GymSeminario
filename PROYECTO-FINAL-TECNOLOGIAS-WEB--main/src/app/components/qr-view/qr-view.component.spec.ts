import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrViewComponent } from './qr-view.component';

describe('QrViewComponent', () => {
  let component: QrViewComponent;
  let fixture: ComponentFixture<QrViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
