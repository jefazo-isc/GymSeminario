import { TestBed } from '@angular/core/testing';

import { MicuentaService } from './micuenta.service';

describe('MicuentaService', () => {
  let service: MicuentaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MicuentaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
