import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { RutinaService } from './rutina.service';
import { PerfilSocio, RespuestaRutina } from '../models/rutina.model';

describe('RutinaService', () => {
  let service: RutinaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RutinaService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(RutinaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente el servicio', () => {
    expect(service).toBeTruthy();
  });

  it('debe enviar perfil a POST /api/rutina y recibir la rutina', () => {
    const mockPerfil: PerfilSocio = {
      nombre: 'Yahir',
      edad: 24,
      peso: 75,
      altura: 175,
      genero: 'Masculino',
      objetivo: 'Fuerza',
      diasDisponibles: 3,
      nivel: 'Intermedio',
      restriccionesMedicas: 'Ninguna'
    };

    const mockRespuesta: RespuestaRutina = {
      exito: true,
      origen: 'gemini',
      data: {
        tituloRutina: 'Rutina de Fuerza',
        objetivo: 'Fuerza',
        nivelRecomendado: 'Intermedio',
        diasSemana: [],
        recomendacionesGenerales: 'Buena técnica'
      }
    };

    service.generarRutina(mockPerfil).subscribe((res) => {
      expect(res.exito).toBeTrue();
      expect(res.data.tituloRutina).toBe('Rutina de Fuerza');
    });

    const req = httpMock.expectOne('http://localhost:3000/api/rutina');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockPerfil);
    req.flush(mockRespuesta);
  });
});
