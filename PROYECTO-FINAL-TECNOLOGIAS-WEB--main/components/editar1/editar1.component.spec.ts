import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Editar1Component } from './editar1.component';

describe('Editar1Component', () => {
  let component: Editar1Component;
  let fixture: ComponentFixture<Editar1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Editar1Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Editar1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
