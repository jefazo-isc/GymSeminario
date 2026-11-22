import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { PagoService } from "./pago.service";

describe("PagoService", () => {
  let service: PagoService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [PagoService] });
    service = TestBed.inject(PagoService);
  });

  it("debe crearse correctamente", () => {
    expect(service).toBeTruthy();
  });

  it("debe cargar el historial inicial de demostración (6 pagos) sin HttpClient", () => {
    expect(service.getPagos().length).toBe(6);
  });

  it("debe registrar un nuevo pago y agregarlo al inicio del historial", () => {
    const totalAntes = service.getPagos().length;
    const nuevo = service.registrarPago(
      "Suplementos",
      380,
      "Efectivo",
      "Proteína Gold Standard",
    );
    expect(service.getPagos().length).toBe(totalAntes + 1);
    expect(service.getPagos()[0].folio).toBe(nuevo.folio);
    expect(nuevo.estado).toBe("Pagado");
    expect(nuevo.concepto).toBe("Suplementos");
  });

  it("debe calcular correctamente el resumen de cuenta", () => {
    const resumen = service.getResumen();
    expect(resumen.totalPagado).toBeGreaterThan(0);
    expect(resumen.totalPendiente).toBeGreaterThanOrEqual(0);
    expect(resumen.ultimoPago).not.toBeNull();
  });

  it("debe marcar un pago pendiente como pagado", () => {
    const pendiente = service.getPagos().find((p) => p.estado === "Pendiente");
    expect(pendiente).toBeTruthy();
    service.marcarComoPagado(pendiente!.id, "Transferencia");
    const actualizado = service.getPagos().find((p) => p.id === pendiente!.id);
    expect(actualizado?.estado).toBe("Pagado");
    expect(actualizado?.metodo).toBe("Transferencia");
  });

  it("debe cancelar un pago pendiente", () => {
    const pendiente = service.getPagos().find((p) => p.estado === "Pendiente");
    expect(pendiente).toBeTruthy();
    service.cancelarPago(pendiente!.id);
    const actualizado = service.getPagos().find((p) => p.id === pendiente!.id);
    expect(actualizado?.estado).toBe("Cancelado");
  });

  it("el observable pagos$ debe emitir al registrar un nuevo pago", (done) => {
    service.pagos$.subscribe((pagos) => {
      if (pagos.length > 6) {
        expect(pagos[0].concepto).toBe("Mensualidad");
        done();
      }
    });
    service.registrarPago("Mensualidad", 550, "QR / App");
  });
});

describe("PagoService Stripe backend sync", () => {
  afterEach(() => localStorage.clear());

  it("starts empty instead of overriding with 6 demo rows when HttpClient is present and syncs GET /api/stripe/transactions", async () => {
    localStorage.clear();
    localStorage.setItem("gym_jwt", "jwt-demo");
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PagoService],
    });
    const http = TestBed.inject(HttpTestingController);
    const svc = TestBed.inject(PagoService);

    expect(svc.getPagos()).toEqual([]);

    const req = http.expectOne((r) =>
      r.url.endsWith("/api/stripe/transactions"),
    );
    req.flush([
      {
        id: "STX-1",
        folio: "STR-778899",
        payment_intent_id: "pi_real_1",
        tipo: "membership",
        plan_nombre: "Pro Fitness",
        monto: 550,
        cupon: null,
        estado: "COMPLETED",
        created_at: "2026-11-22T10:00:00Z",
      },
      {
        id: "STX-2",
        folio: "STR-112233",
        payment_intent_id: "pi_real_2",
        tipo: "product",
        plan_nombre: "Gymshark Whey Protein",
        monto: 1350,
        cupon: null,
        estado: "COMPLETED",
        created_at: "2026-11-22T11:00:00Z",
      },
    ]);

    await Promise.resolve();
    const pagos = svc.getPagos();
    expect(pagos.length).toBe(2);
    expect(pagos[0].folio).toBe("STR-778899");
    expect(pagos[0].concepto).toBe("Mensualidad");
    expect(pagos[0].monto).toBe(550);
    expect(pagos[1].concepto).toBe("Suplementos");
    expect(svc.isSyncedFromServer()).toBeTrue();
    http.verify();
  });
});
