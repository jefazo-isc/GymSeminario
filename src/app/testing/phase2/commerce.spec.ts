import { BreakpointObserver } from "@angular/cdk/layout";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import type { Stripe, StripeCardElement } from "@stripe/stripe-js";
import { of } from "rxjs";
import Swal from "sweetalert2";
import { STRIPE_LOADER } from "../../core/config/app-endpoints";
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

function createFakeStripeHarness() {
  let changeHandler:
    | ((ev: { complete: boolean; error?: { message: string } }) => void)
    | undefined;
  const confirmCardPayment = jasmine
    .createSpy("confirmCardPayment")
    .and.resolveTo({
      paymentIntent: { id: "pi_stripe_ok_1", status: "succeeded" },
    });
  const fakeCard = {
    mount: jasmine.createSpy("mount"),
    unmount: jasmine.createSpy("unmount"),
    destroy: jasmine.createSpy("destroy"),
    blur: jasmine.createSpy("blur"),
    clear: jasmine.createSpy("clear"),
    focus: jasmine.createSpy("focus"),
    update: jasmine.createSpy("update"),
    on: jasmine.createSpy("on").and.callFake(
      (
        event: string,
        handler: (ev: { complete: boolean; error?: { message: string } }) => void,
      ) => {
        if (event === "change") changeHandler = handler;
        if (event === "ready") (handler as () => void)();
        return fakeCard;
      },
    ),
    once: jasmine.createSpy("once"),
    off: jasmine.createSpy("off"),
  } as unknown as StripeCardElement;
  const fakeStripe = {
    elements: () => ({
      create: () => fakeCard,
    }),
    confirmCardPayment,
  } as unknown as Stripe;

  return {
    fakeStripe,
    fakeCard,
    confirmCardPayment,
    triggerComplete: (complete = true, errorMsg?: string) =>
      changeHandler?.({
        complete,
        error: errorMsg ? { message: errorMsg } : undefined,
      }),
  };
}

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
    const options = modal.calls.mostRecent().args[0] as {
      input?: string;
      html?: string;
    };
    expect(options.input).toBe("checkbox");
    expect(options.html).toContain("no es una cotización");
    expect(activate).not.toHaveBeenCalled();
    expect(fixture.componentInstance.processing).toBeFalse();
  });
});

describe("Product cart", () => {
  let http: HttpTestingController;
  let registrarPagoSpy: jasmine.Spy;
  let stripeHarness: ReturnType<typeof createFakeStripeHarness>;

  function flushInitialCatalog(custom?: unknown[]) {
    for (const req of http.match((r) => r.url.endsWith("/api/products"))) {
      req.flush(custom ?? []);
    }
  }

  beforeEach(() => {
    localStorage.removeItem("espacio_gym_carrito");
    localStorage.removeItem("gym_user");
    stripeHarness = createFakeStripeHarness();
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
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: false, breakpoints: {} }) },
        },
        {
          provide: STRIPE_LOADER,
          useValue: () => Promise.resolve(stripeHarness.fakeStripe),
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
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    flushInitialCatalog();
    http.verify();
    localStorage.removeItem("espacio_gym_carrito");
    localStorage.removeItem("gym_user");
  });

  it("preserves all forty prices with item #1 at $1350, groups units and computes an exact total", () => {
    const fixture = TestBed.createComponent(ProductosComponent);
    flushInitialCatalog();
    const component = fixture.componentInstance;
    expect(component.productos.length).toBe(40);
    expect(component.productos[0].precio).toBe(1350);
    component.agregarAlCarrito(component.productos[0]);
    component.agregarAlCarrito(component.productos[0]);
    component.agregarAlCarrito(component.productos[1]);
    expect(component.cartLines[0].quantity).toBe(2);
    expect(component.total).toBe(4100);
    component.changeQuantity(component.productos[0], -1);
    expect(component.total).toBe(2750);
    component.removeProduct(2);
    expect(cartTotal(component.carrito)).toBe(1350);
  });

  it("filters and sorts locally without mutating the catalog order", () => {
    const component =
      TestBed.createComponent(ProductosComponent).componentInstance;
    flushInitialCatalog();
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
    flushInitialCatalog();
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

  it("retains the cart when Stripe Elements card is incomplete or checkout is cancelled", async () => {
    const fixture = TestBed.createComponent(ProductosComponent);
    flushInitialCatalog();
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

  it("confirms card payment via Stripe Elements, calls create-payment-intent -> confirm-payment, and registers in BILLING", async () => {
    const fixture = TestBed.createComponent(ProductosComponent);
    flushInitialCatalog();
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.agregarAlCarrito(component.productos[0]); // $1350
    component.reviewed = true;
    component.reviewCheckout();
    fixture.detectChanges();
    await fixture.whenStable();

    const mountHost = fixture.nativeElement.querySelector("#stripe-card-element");
    expect(mountHost).not.toBeNull();
    stripeHarness.triggerComplete(true);

    component.cardHolder = "Socio Prueba";
    const pending = component.submitStripePayment();

    const intentReq = http.expectOne((r) =>
      r.url.endsWith("/api/stripe/create-payment-intent"),
    );
    expect(intentReq.request.body.type).toBe("product");
    expect(intentReq.request.body.precio).toBe(1350);
    intentReq.flush({
      exito: true,
      clientSecret: "pi_sec_test_1",
      paymentIntentId: "pi_stripe_ok_1",
      precioFinal: 1350,
    });

    await Promise.resolve();
    await Promise.resolve();

    const confirmReq = http.expectOne((r) =>
      r.url.endsWith("/api/stripe/confirm-payment"),
    );
    expect(confirmReq.request.body.type).toBe("product");
    expect(confirmReq.request.body.paymentIntentId).toBe("pi_stripe_ok_1");
    confirmReq.flush({
      ok: true,
      folio: "STR-908172",
      paymentIntentId: "pi_stripe_ok_1",
    });

    await pending;

    expect(stripeHarness.confirmCardPayment).toHaveBeenCalled();
    expect(registrarPagoSpy).toHaveBeenCalledWith(
      "Suplementos",
      1350,
      "Tarjeta de crédito",
      jasmine.stringMatching(/Stripe ID: pi_stripe_ok_1/),
      "STR-908172",
    );
    expect(component.carrito.length).toBe(0);
    expect(component.total).toBe(0);
    expect(component.paymentState).toBe("complete");
    expect(component.lastReceipt?.folio).toBe("STR-908172");
  });

  it("never marks unpaid orders as paid locally when confirm-payment fails on the server", async () => {
    const fixture = TestBed.createComponent(ProductosComponent);
    flushInitialCatalog();
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.agregarAlCarrito(component.productos[0]);
    component.reviewed = true;
    component.couponCode = "UAACOMITE";
    component.applyCoupon();

    const pending = component.submitStripePayment();
    const intentReq = http.expectOne((r) =>
      r.url.endsWith("/api/stripe/create-payment-intent"),
    );
    intentReq.flush({ exito: true, freeCoupon: true, precioFinal: 0 });
    await Promise.resolve();

    const confirmReq = http.expectOne((r) =>
      r.url.endsWith("/api/stripe/confirm-payment"),
    );
    confirmReq.flush(
      { error: "No autorizado" },
      { status: 500, statusText: "Server Error" },
    );

    await pending;

    expect(registrarPagoSpy).not.toHaveBeenCalled();
    expect(component.carrito.length).toBe(1);
    expect(component.paymentState).toBe("error");
  });

  it("supports 100% coupon bypass (UAACOMITE) via backend endpoints without card element and registers $0.00", async () => {
    const fixture = TestBed.createComponent(ProductosComponent);
    flushInitialCatalog();
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.agregarAlCarrito(component.productos[1]); // $1400
    component.reviewed = true;
    component.couponCode = "UAACOMITE";
    component.applyCoupon();
    expect(component.isCourtesyBypass).toBeTrue();

    const pending = component.submitStripePayment();
    const intentReq = http.expectOne((r) =>
      r.url.endsWith("/api/stripe/create-payment-intent"),
    );
    expect(intentReq.request.body.cupon).toBe("UAACOMITE");
    intentReq.flush({
      exito: true,
      freeCoupon: true,
      precioFinal: 0,
      paymentIntentId: "pi_free_100",
    });
    await Promise.resolve();

    const confirmReq = http.expectOne((r) =>
      r.url.endsWith("/api/stripe/confirm-payment"),
    );
    expect(confirmReq.request.body.type).toBe("product");
    expect(confirmReq.request.body.finalPrice).toBe(0);
    expect(confirmReq.request.body.cupon).toBe("UAACOMITE");
    confirmReq.flush({
      ok: true,
      folio: "STR-551234",
      paymentIntentId: "pi_free_100",
    });
    await pending;

    expect(stripeHarness.confirmCardPayment).not.toHaveBeenCalled();
    expect(registrarPagoSpy).toHaveBeenCalledWith(
      "Suplementos",
      0,
      "Tarjeta de crédito",
      jasmine.stringMatching(/Cupón: UAACOMITE/),
      "STR-551234",
    );
    expect(component.carrito.length).toBe(0);
    expect(component.paymentState).toBe("complete");
  });

  it("loads live catalog from GET /api/products and supports admin product CRUD", async () => {
    localStorage.setItem(
      "gym_user",
      JSON.stringify({
        uid: 1,
        nombre: "Admin",
        email: "admin@gymseminario.com",
        role: "admin",
      }),
    );
    const fixture = TestBed.createComponent(ProductosComponent);
    flushInitialCatalog([
      {
        id: 1,
        nombre: "Gymshark Whey Protein",
        descripcion: "Actualizado",
        precio: 1350,
        imagen: "img/product-placeholder.svg",
        categoria: "proteina",
      },
    ]);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.isAdmin).toBeTrue();
    expect(component.productos.length).toBe(1);

    component.startNewProduct();
    component.adminForm = {
      nombre: "Shaker GROM",
      descripcion: "700ml",
      precio: 250,
      imagen: "img/product-placeholder.svg",
      categoria: "accesorio",
    };
    const creating = component.saveAdminProduct();
    const postReq = http.expectOne((r) => r.url.endsWith("/api/products"));
    expect(postReq.request.method).toBe("POST");
    postReq.flush({ id: 99, ...component.adminForm });
    await creating;
    expect(component.productos.some((p) => p.id === 99)).toBeTrue();
  });
});

describe("Local receipt safety", () => {
  it("escapes free text instead of allowing markup in a receipt", () => {
    expect(escapeHtml("<script>\"&'</script>")).toBe(
      "&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;",
    );
  });
});
