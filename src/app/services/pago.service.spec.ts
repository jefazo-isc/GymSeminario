import { TestBed } from '@angular/core/testing';
import { PagoService } from './pago.service';
import { Pago } from '../models/pago.model';

describe('PagoService', () => {
  let service: PagoService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [PagoService] });
    service = TestBed.inject(PagoService);
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe cargar el historial inicial de demostración (6 pagos)', () => {
    expect(service.getPagos().length).toBe(6);
  });

  it('debe registrar un nuevo pago y agregarlo al inicio del historial', () => {
    const totalAntes = service.getPagos().length;
    const nuevo = service.registrarPago('Suplementos', 380, 'Efectivo', 'Proteína Gold Standard');
    expect(service.getPagos().length).toBe(totalAntes + 1);
    expect(service.getPagos()[0].folio).toBe(nuevo.folio);
    expect(nuevo.estado).toBe('Pagado');
    expect(nuevo.concepto).toBe('Suplementos');
  });

  it('debe calcular correctamente el resumen de cuenta', () => {
    const resumen = service.getResumen();
    expect(resumen.totalPagado).toBeGreaterThan(0);
    expect(resumen.totalPendiente).toBeGreaterThanOrEqual(0);
    expect(resumen.ultimoPago).not.toBeNull();
  });

  it('debe marcar un pago pendiente como pagado', () => {
    const pendiente = service.getPagos().find(p => p.estado === 'Pendiente');
    expect(pendiente).toBeTruthy();
    service.marcarComoPagado(pendiente!.id, 'Transferencia');
    const actualizado = service.getPagos().find(p => p.id === pendiente!.id);
    expect(actualizado?.estado).toBe('Pagado');
    expect(actualizado?.metodo).toBe('Transferencia');
  });

  it('debe cancelar un pago pendiente', () => {
    const pendiente = service.getPagos().find(p => p.estado === 'Pendiente');
    expect(pendiente).toBeTruthy();
    service.cancelarPago(pendiente!.id);
    const actualizado = service.getPagos().find(p => p.id === pendiente!.id);
    expect(actualizado?.estado).toBe('Cancelado');
  });

  it('el observable pagos$ debe emitir al registrar un nuevo pago', (done) => {
    service.pagos$.subscribe(pagos => {
      if (pagos.length > 6) {
        expect(pagos[0].concepto).toBe('Mensualidad');
        done();
      }
    });
    service.registrarPago('Mensualidad', 550, 'QR / App');
  });
});
