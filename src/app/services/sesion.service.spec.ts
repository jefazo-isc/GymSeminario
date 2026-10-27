import { TestBed } from '@angular/core/testing';
import { SesionService } from './sesion.service';

describe('SesionService', () => {
  let service: SesionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [SesionService] });
    service = TestBed.inject(SesionService);
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe cargar 8 sesiones de demostración por defecto', () => {
    expect(service.getHistorial().length).toBe(8);
  });

  it('debe cancelar correctamente una sesión reservada', () => {
    const reservada = service.getHistorial().find(s => s.estado === 'Reservada');
    expect(reservada).toBeTruthy();
    service.cancelarSesion(reservada!.id);
    const actualizada = service.getHistorial().find(s => s.id === reservada!.id);
    expect(actualizada?.estado).toBe('Cancelada');
  });

  it('debe marcar como asistida una sesión', () => {
    const sesion = service.getHistorial()[0];
    service.marcarAsistida(sesion.id);
    const actualizada = service.getHistorial().find(s => s.id === sesion.id);
    expect(actualizada?.estado).toBe('Asistida');
  });

  it('debe retornar 8 bloques de ocupación por horario', () => {
    const ocupacion = service.getOcupacionHorarios();
    expect(ocupacion.length).toBe(8);
  });

  it('debe calcular correctamente el porcentaje de ocupación', () => {
    const ocupacion = service.getOcupacionHorarios();
    const primer = ocupacion[0]; // 19/20 = 95%
    expect(service.getPorcentajeOcupacion(primer)).toBe(95);
  });

  it('debe clasificar nivel de ocupación correctamente', () => {
    expect(service.getNivelOcupacion(95)).toBe('lleno');
    expect(service.getNivelOcupacion(70)).toBe('moderado');
    expect(service.getNivelOcupacion(40)).toBe('libre');
  });

  it('debe cargar alertas y contar las no leídas', () => {
    const sinLeer = service.getAlertasSinLeer();
    expect(sinLeer).toBeGreaterThan(0);
  });

  it('debe marcar una alerta como leída', () => {
    const noLeida = service.getAlertas().find(a => !a.leida);
    expect(noLeida).toBeTruthy();
    service.marcarLeidaAlerta(noLeida!.id);
    const actualizada = service.getAlertas().find(a => a.id === noLeida!.id);
    expect(actualizada?.leida).toBeTrue();
  });

  it('debe marcar TODAS las alertas como leídas', () => {
    service.marcarTodasLeidas();
    expect(service.getAlertasSinLeer()).toBe(0);
  });
});
