import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FiltroEjerciciosComponent } from './filtro-ejercicios.component';

describe('FiltroEjerciciosComponent', () => {
  let component: FiltroEjerciciosComponent;
  let fixture: ComponentFixture<FiltroEjerciciosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FiltroEjerciciosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FiltroEjerciciosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
