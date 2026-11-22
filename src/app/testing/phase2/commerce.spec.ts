import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of } from "rxjs";
import Swal from "sweetalert2";
import { BILLING } from "../../features/billing/data-access/billing.repository";
import { MembresiaService } from "../../features/memberships/data-access/membresia.service";
import {
  MembresiasComponent,
  demoPrice,
} from "../../features/memberships/pages/membresias/membresias.component";
import {
  ProductosComponent,
  cartTotal,
} from "../../features/products/pages/productos/productos.component";
import { escapeHtml } from "../../shared/ui/escape-html";

describe("Membership review", () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [MembresiasComponent],
      providers: [provideRouter([])],
    }),
  );
  it("keeps the existing total-per-cycle arithmetic", () => {
    expect(demoPrice(350, "Mensual")).toBe(350);
    expect(demoPrice(350, "Trimestral")).toBe(945);
    expect(demoPrice(550, "Anual")).toBe(5280);
  });
  it("flags the actual Black Elite catalog contradiction instead of silently changing its price", () => {
    const fixture = TestBed.createComponent(MembresiasComponent);
    fixture.detectChanges();
    const black = fixture.componentInstance.planes.find(
      (plan) => plan.id === "plan-black",
    )!;
    expect(black.precio).toBe(1200);
    expect(black.periodo).toBe("Trimestral");
    expect(fixture.componentInstance.hasConflict(black)).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain("Tarifa en revisión");
    expect(fixture.nativeElement.querySelector(".badge-popular")).toBeNull();
  });
  it("requires an explicit acknowledgment for the inconsistent demo and does not activate on cancellation", async () => {
    const fixture = TestBed.createComponent(MembresiasComponent);
    const service = TestBed.inject(MembresiaService);
    const activate = spyOn(service, "adquirirOActualizarPlan");
    const modal = spyOn(Swal, "fire").and.resolveTo({
      isConfirmed: false,
      isDenied: false,
      isDismissed: true,
    });
    await fixture.componentInstance.seleccionarPlan(
      fixture.componentInstance.planes.find((p) => p.id === "plan-black")!,
    );
    const options = modal.calls.mostRecent().args[0] as any;
    expect(options.input).toBe("checkbox");
    expect(options.html).toContain("no es una cotización");
    expect(activate).not.toHaveBeenCalled();
    expect(fixture.componentInstance.processing).toBeFalse();
  });
});

describe("Product cart", () => {
  let http: HttpTestingController;
  let registrarPagoSpy: jasmine.Spy;

  beforeEach(() => {
    registrarPagoSpy = jasmine
      .createSpy("registrarPago")
      .and.callFake((concepto, monto, metodo, descripcion, customFolio) => ({
        id: "tx-unit",
        folio: customFolio || "STR-000001",
        concepto,
        monto,
        fecha: "2026-11-22",
        metodo,
        estado: "Pagado",
        descripcion,
      }));
    TestBed.configureTestingModule({
      imports: [ProductosComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
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
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
  });
  it("preserves all forty prices, groups units and computes an exact total", () => {
    const fixture = TestBed.createComponent(ProductosComponent);
    const component = fixture.componentInstance;
    expect(component.productos.length).toBe(40);
    expect(component.productos[0].precio).toBe(1);
    component.agregarAlCarrito(component.productos[0]);
    component.agregarAlCarrito(component.productos[0]);
    component.agregarAlCarrito(component.productos[1]);
    expect(component.cartLines[0].quantity).toBe(2);
    expect(component.total).toBe(1402);
    component.changeQuantity(component.productos[0], -1);
    expect(component.total).toBe(1401);
    component.removeProduct(2);
    expect(cartTotal(component.carrito)).toBe(1);
  });
  it("filters and sorts locally without mutating the catalog order", () => {
    const component =
      TestBed.createComponent(ProductosComponent).componentInstance;
    component.category = "creatina";
    component.sort = "price-desc";
    expect(component.filtered.length).toBe(8);
    expect(component.filtered[0].precio).toBeGreaterThanOrEqual(
      component.filtered[1].precio,
    );
    expect(component.productos[0].id).toBe(1);
    component.query = "no-existe";
    expect(component.filtered.length).toBe(0);
  });
  it("applies institutional 100% bypass coupons and percentage promo codes", () => {
    const fixture = TestBed.createComponent(ProductosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.agregarAlCarrito(component.productos[1]); // $1400
    for (const code of ["UAACOMITE", "COMITE", "WACOMYT", "WACOM", "UAA"]) {
      component.couponCode = code;
      component.applyCoupon();
      expect(component.activeCoupon?.porcentaje).toBe(100);
      expect(component.finalTotal).toBe(0);
      expect(component.isCourtesyBypass).toBeTrue();
    }
    component.couponCode = "PROMO50";
    component.applyCoupon();
    expect(component.finalTotal).toBe(700);
    expect(component.isCourtesyBypass).toBeFalse();

    component.couponCode = "PROMO20";
    component.applyCoupon();
    expect(component.finalTotal).toBe(1120);

    component.couponCode = "NO_EXISTE";
    component.applyCoupon();
    expect(component.activeCoupon).toBeNull();
    expect(component.couponError).toContain("Cupón no válido");
  });
  it("retains the cart on cancellation or invalid card details", async () => {
    const fixture = TestBed.createComponent(ProductosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.agregarAlCarrito(component.productos[0]);
    component.reviewed = true;
    await component.submitStripePayment();
    expect(component.paymentState).toBe("error");
    expect(component.carrito.length).toBe(1);

    component.cancelStripeCheckout();
    fixture.detectChanges();
    expect(component.paymentMessage).toContain("se canceló");
    expect(component.carrito.length).toBe(1);
    expect(component.reviewed).toBeFalse();
  });
  it("keeps the amount contract, calls /api/stripe/confirm-payment with type 'product', and registers in BILLING with folio STR-XXXXXX", async () => {
    const fixture = TestBed.createComponent(ProductosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.agregarAlCarrito(component.productos[0]);
    component.changeQuantity(component.productos[0], 1);
    component.reviewed = true;
    component.reviewCheckout();
    component.cardHolder = "Socio Prueba";
    component.cardNumber = "4242 4242 4242 4242";
    component.cardExpiry = "12/28";
    component.cardCvc = "123";

    const pending = component.submitStripePayment();
    const req = http.expectOne((r) =>
      r.url.endsWith("/api/stripe/confirm-payment"),
    );
    expect(req.request.method).toBe("POST");
    expect(req.request.body.type).toBe("product");
    expect(req.request.body.precio).toBe(2);
    expect(req.request.body.finalPrice).toBe(2);
    expect(component.carrito.length).toBe(2);
    expect(component.checkoutPending).toBeTrue();

    req.flush({
      ok: true,
      folio: "STR-908172",
      paymentIntentId: "pi_live_prod_1",
    });
    await pending;

    expect(registrarPagoSpy).toHaveBeenCalledWith(
      "Suplementos",
      2,
      "Tarjeta de crédito",
      jasmine.stringMatching(/Stripe ID: pi_live_prod_1/),
      "STR-908172",
    );
    expect(component.carrito.length).toBe(0);
    expect(component.total).toBe(0);
    expect(component.paymentState).toBe("complete");
    expect(component.lastReceipt?.folio).toBe("STR-908172");
  });
  it("supports 100% coupon bypass (UAACOMITE) without card details and registers $0.00 in BILLING", async () => {
    const fixture = TestBed.createComponent(ProductosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.agregarAlCarrito(component.productos[1]); // $1400
    component.reviewed = true;
    component.couponCode = "UAACOMITE";
    component.applyCoupon();
    expect(component.isCourtesyBypass).toBeTrue();

    const pending = component.submitStripePayment();
    const req = http.expectOne((r) =>
      r.url.endsWith("/api/stripe/confirm-payment"),
    );
    expect(req.request.body.type).toBe("product");
    expect(req.request.body.finalPrice).toBe(0);
    expect(req.request.body.cupon).toBe("UAACOMITE");
    req.flush({ ok: true });
    await pending;

    expect(registrarPagoSpy).toHaveBeenCalledWith(
      "Suplementos",
      0,
      "Tarjeta de crédito",
      jasmine.stringMatching(/Cupón: UAACOMITE/),
      jasmine.stringMatching(/^STR-\d{6}$/),
    );
    expect(component.carrito.length).toBe(0);
    expect(component.paymentState).toBe("complete");
  });
});

describe("Local receipt safety", () => {
  it("escapes free text instead of allowing markup in a receipt", () => {
    expect(escapeHtml("<script>\"&'</script>")).toBe(
      "&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;",
    );
  });
});
