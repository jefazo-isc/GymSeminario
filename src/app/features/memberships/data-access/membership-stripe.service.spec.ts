import { TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { BILLING } from "../../billing/data-access/billing.repository";
import { MEMBERSHIPS } from "./membership.repository";
import { MembershipStripeService } from "./membership-stripe.service";

describe("MembershipStripeService & Coupon Discount Engine", () => {
  let service: MembershipStripeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MembershipStripeService,
        {
          provide: MEMBERSHIPS,
          useValue: {
            membresiaActual$: of(null),
            loadPlans: () => of([]),
            adquirirOActualizarPlan: () => Promise.resolve(),
            renovarMembresia: () => Promise.resolve(),
          },
        },
        {
          provide: BILLING,
          useValue: {
            pagos$: of([]),
            registrarPago: () => ({
              id: "1",
              folio: "STR-123456",
              concepto: "Mensualidad",
              monto: 0,
              fecha: "2026-11-22",
              metodo: "Tarjeta de crédito",
              estado: "Pagado",
            }),
            marcarComoPagado: () => {},
            cancelarPago: () => {},
          },
        },
      ],
    });

    service = TestBed.inject(MembershipStripeService);
  });

  it("can be injected with fallback defaults", () => {
    expect(service).toBeTruthy();
  });

  it("applies 100% discount for institutional evaluation coupon UAACOMITE", () => {
    const res = service.validarCupon("UAACOMITE", 550);
    expect(res).not.toBeNull();
    expect(res?.codigo).toBe("UAACOMITE");
    expect(res?.porcentaje).toBe(100);
    expect(res?.descuento).toBe(550);
    expect(res?.precioFinal).toBe(0);
  });

  it("applies 100% discount for committee aliases (COMITE, WACOMYT, WACOM, UAA)", () => {
    const aliases = ["COMITE", "WACOMYT", "WACOM", "UAA", "comite", "uaacomite"];
    for (const code of aliases) {
      const res = service.validarCupon(code, 550);
      expect(res).not.toBeNull();
      expect(res?.precioFinal).toBe(0);
      expect(res?.porcentaje).toBe(100);
    }
  });

  it("applies 50% discount for PROMO50 and 20% for PROMO20", () => {
    const promo50 = service.validarCupon("PROMO50", 550);
    expect(promo50?.precioFinal).toBe(275);
    expect(promo50?.descuento).toBe(275);

    const promo20 = service.validarCupon("PROMO20", 1000);
    expect(promo20?.precioFinal).toBe(800);
    expect(promo20?.descuento).toBe(200);
  });

  it("returns null for non-existent or invalid coupon codes", () => {
    expect(service.validarCupon("INVENTADO", 550)).toBeNull();
    expect(service.validarCupon("", 550)).toBeNull();
  });
});
