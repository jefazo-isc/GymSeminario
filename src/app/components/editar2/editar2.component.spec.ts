import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Editar2Component } from './editar2.component';

describe('Editar2Component', () => {
  let component: Editar2Component;
  let fixture: ComponentFixture<Editar2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Editar2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Editar2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
