import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import type { Stripe, StripeCardElement } from "@stripe/stripe-js";
import { of } from "rxjs";
import Swal from "sweetalert2";
import { BILLING } from "../../billing/data-access/billing.repository";
import { MEMBERSHIPS } from "./membership.repository";
import { MembershipStripeService } from "./membership-stripe.service";

describe("MembershipStripeService & Coupon Discount Engine", () => {
  let service: MembershipStripeService;
  let http: HttpTestingController;
  let adquirirSpy: jasmine.Spy;
  let registrarPagoSpy: jasmine.Spy;

  beforeEach(() => {
    adquirirSpy = jasmine.createSpy("adquirirOActualizarPlan").and.resolveTo();
    registrarPagoSpy = jasmine.createSpy("registrarPago").and.resolveTo({
      id: "1",
      folio: "STR-123456",
      concepto: "Mensualidad",
      monto: 0,
      fecha: "2026-11-22",
      metodo: "Tarjeta de crédito",
      estado: "Pagado",
    });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MembershipStripeService,
        {
          provide: MEMBERSHIPS,
          useValue: {
            membresiaActual$: of(null),
            loadPlans: () => of([]),
            adquirirOActualizarPlan: adquirirSpy,
            renovarMembresia: () => Promise.resolve(),
          },
        },
        {
          provide: BILLING,
          useValue: {
            pagos$: of([]),
            registrarPago: registrarPagoSpy,
            marcarComoPagado: () => {},
            cancelarPago: () => {},
          },
        },
      ],
    });

    service = TestBed.inject(MembershipStripeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
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

  it("creates PaymentIntent, confirms card via Stripe Elements, and posts confirm-payment", async () => {
    spyOn(Swal, "fire").and.resolveTo({
      isConfirmed: true,
      isDenied: false,
      isDismissed: false,
    });
    const confirmCardPayment = jasmine
      .createSpy("confirmCardPayment")
      .and.resolveTo({
        paymentIntent: { id: "pi_mem_ok", status: "succeeded" },
      });
    const fakeStripe = { confirmCardPayment } as unknown as Stripe;
    const fakeCard = {} as StripeCardElement;

    const op = service.procesarPagoYActivacion({
      plan: {
        id: "plan-pro",
        nombre: "Pro Fitness",
        precio: 550,
        periodo: "Mensual",
        descripcion: "Pro",
        beneficios: ["Acceso"],
      },
      periodo: "Mensual",
      precioOriginal: 550,
      precioFinal: 550,
      userEmail: "socio@test.com",
      userName: "Socio Test",
      stripe: fakeStripe,
      cardElement: fakeCard,
    });

    http
      .expectOne((r) => r.url.endsWith("/api/stripe/create-payment-intent"))
      .flush({
        exito: true,
        clientSecret: "pi_sec_mem",
        paymentIntentId: "pi_mem_ok",
        precioFinal: 550,
      });

    await Promise.resolve();
    await Promise.resolve();

    const confirmReq = http.expectOne((r) =>
      r.url.endsWith("/api/stripe/confirm-payment"),
    );
    expect(confirmReq.request.body.paymentIntentId).toBe("pi_mem_ok");
    confirmReq.flush({ ok: true, folio: "STR-445566", paymentIntentId: "pi_mem_ok" });

    const res = await op;
    expect(res.folio).toBe("STR-445566");
    expect(confirmCardPayment).toHaveBeenCalled();
    expect(adquirirSpy).toHaveBeenCalled();
    expect(registrarPagoSpy).toHaveBeenCalledWith(
      "Mensualidad",
      550,
      "Tarjeta de crédito",
      jasmine.stringMatching(/pi_mem_ok/),
      "STR-445566",
    );
  });

  it("never activates membership or records payment when server confirm-payment fails", async () => {
    const op = service.procesarPagoYActivacion({
      plan: {
        id: "plan-pro",
        nombre: "Pro Fitness",
        precio: 550,
        periodo: "Mensual",
        descripcion: "Pro",
        beneficios: ["Acceso"],
      },
      periodo: "Mensual",
      precioOriginal: 550,
      precioFinal: 0,
      cupon: "UAACOMITE",
      userEmail: "socio@test.com",
      userName: "Socio Test",
    });

    http
      .expectOne((r) => r.url.endsWith("/api/stripe/create-payment-intent"))
      .flush({ exito: true, freeCoupon: true, precioFinal: 0 });
    await Promise.resolve();

    http
      .expectOne((r) => r.url.endsWith("/api/stripe/confirm-payment"))
      .flush({ error: "Error de servidor" }, { status: 500, statusText: "Error" });

    await expectAsync(op).toBeRejected();
    expect(adquirirSpy).not.toHaveBeenCalled();
    expect(registrarPagoSpy).not.toHaveBeenCalled();
  });
});
