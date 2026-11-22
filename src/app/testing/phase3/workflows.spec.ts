import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import type { Stripe, StripeCardElement } from "@stripe/stripe-js";
import { of } from "rxjs";
import { routes } from "../../app.routes";
import { STRIPE_LOADER } from "../../core/config/app-endpoints";
import { ThemeService } from "../../core/theme/theme.service";
import {
  SESSION,
  SessionRepository,
} from "../../features/auth/data-access/session.repository";
import { BILLING } from "../../features/billing/data-access/billing.repository";
import { COURSES } from "../../features/courses/data-access/course.repository";
import { BuscarComponent } from "../../features/courses/pages/buscar/buscar.component";
import { CartStore } from "../../features/products/data-access/cart.store";
import { StripeCheckoutAdapter } from "../../features/products/data-access/stripe-checkout.adapter";
import { ProductosComponent } from "../../features/products/pages/productos/productos.component";
import {
  TRAINING,
  TrainingRepository,
} from "../../features/training/data-access/training.repository";
import { Formulario2Component } from "../../features/training/pages/formulario2/formulario2.component";
import { RequestStateComponent } from "../../shared/ui/request-state/request-state.component";

function buildStripeMock(confirmCardPayment: jasmine.Spy) {
  let changeCb:
    | ((ev: { complete: boolean; error?: { message: string } }) => void)
    | undefined;
  const card = {
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
        if (event === "change") changeCb = handler;
        return card;
      },
    ),
    once: jasmine.createSpy("once"),
    off: jasmine.createSpy("off"),
  } as unknown as StripeCardElement;
  const stripe = {
    elements: () => ({ create: () => card }),
    confirmCardPayment,
  } as unknown as Stripe;
  return {
    stripe,
    markComplete: () => changeCb?.({ complete: true }),
  };
}

describe("Confirmed record and independent notification", () => {
  let repository: jasmine.SpyObj<TrainingRepository>;
  afterEach(() => localStorage.removeItem("gym_user"));
  beforeEach(() => {
    localStorage.setItem(
      "gym_user",
      JSON.stringify({
        uid: "unit",
        nombre: "Unit",
        email: "unit@example.test",
        role: "user",
      }),
    );
    repository = jasmine.createSpyObj<TrainingRepository>("training", [
      "createBooking",
      "notifyBooking",
    ]);
    repository.createBooking.and.resolveTo({ id: "confirmed-unit" });
    repository.notifyBooking.and.rejectWith(new Error("Notification offline"));
    TestBed.configureTestingModule({
      imports: [Formulario2Component],
      providers: [
        provideRouter([]),
        { provide: TRAINING, useValue: repository },
        {
          provide: SESSION,
          useValue: {
            getCurrentUser: () => Promise.resolve(null),
            userUid$: of(null),
          } as Partial<SessionRepository>,
        },
      ],
    });
  });
  it("can replace the data adapter without changing the page or resending the saved booking", async () => {
    const component =
      TestBed.createComponent(Formulario2Component).componentInstance;
    component.formulario.setValue({
      entrenamiento: "Pesas",
      fecha: "2099-01-01",
      turno: "Mañana",
    });
    await component.enviarFormulario();
    expect(component.enviado).toBeTrue();
    expect(component.recordId).toBe("confirmed-unit");
    expect(component.notificationError).toBeTrue();
    repository.notifyBooking.and.resolveTo("email");
    await component.retryNotification();
    expect(repository.createBooking.calls.count()).toBe(1);
    expect(repository.notifyBooking.calls.count()).toBe(2);
    expect(component.notificationError).toBeFalse();
    expect(repository.createBooking.calls.first().args[0]).toEqual({
      entrenamiento: "Pesas",
      fecha: "2099-01-01",
      turno: "Mañana",
      usuario: "unit",
      email: "unit@example.test",
      telefono: null,
      nombre: "Unit",
    });
  });
  it("does not offer a notification retry before the record exists", async () => {
    const component =
      TestBed.createComponent(Formulario2Component).componentInstance;
    await component.retryNotification();
    expect(repository.notifyBooking).not.toHaveBeenCalled();
    expect(repository.createBooking).not.toHaveBeenCalled();
  });
  it("prevents duplicate bookings while the adapter has not confirmed the first write", async () => {
    let complete!: (value: { id: string }) => void;
    repository.createBooking.and.returnValue(
      new Promise((resolve) => (complete = resolve)),
    );
    const component =
      TestBed.createComponent(Formulario2Component).componentInstance;
    component.formulario.setValue({
      entrenamiento: "Pesas",
      fecha: "2099-01-01",
      turno: "Mañana",
    });
    const pending = component.enviarFormulario();
    await Promise.resolve();
    await component.enviarFormulario();
    expect(repository.createBooking.calls.count()).toBe(1);
    complete({ id: "confirmed-unit" });
    await pending;
  });
});

describe("Navigation, state presentation and retained inputs", () => {
  afterEach(() => localStorage.removeItem("espacio_gym_carrito"));

  it("keeps every concrete URL and defers feature component loading", () => {
    const concrete = routes.filter(
      (route) => route.path && route.path !== "auth" && !route.redirectTo,
    );
    expect(concrete.length).toBe(25);
    expect(
      concrete.every((route) => !!route.loadComponent && !route.component),
    ).toBeTrue();
    expect(routes.find((r) => r.path === "auth")?.loadChildren).toBeDefined();
  });

  it("uses a replaceable course catalog with the existing query route", () => {
    const find = jasmine.createSpy().and.returnValue(
      of([
        {
          id: 900,
          nombre: "Injected course",
          duracion: "1h",
          img: "unit.png",
          descripcion: "Unit",
        },
      ]),
    );
    TestBed.configureTestingModule({
      imports: [BuscarComponent],
      providers: [
        provideRouter([]),
        { provide: COURSES, useValue: { loadCatalog: find } },
      ],
    });
    const component =
      TestBed.createComponent(BuscarComponent).componentInstance;
    expect(component.resultados[0].id).toBe(900);
    expect(find).toHaveBeenCalledWith();
  });

  it("keeps cart and filters when the theme changes and persists cart in BrowserStorage when recreated", () => {
    localStorage.removeItem("espacio_gym_carrito");
    TestBed.configureTestingModule({
      imports: [ProductosComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ProductosComponent);
    const component = fixture.componentInstance;
    component.query = "Unit filter";
    component.category = "creatina";
    component.agregarAlCarrito(component.productos[0]);
    const theme = TestBed.inject(ThemeService);
    const previous = theme.preference();
    theme.setPreference(previous === "dark" ? "light" : "dark");
    expect(component.query).toBe("Unit filter");
    expect(component.category).toBe("creatina");
    expect(component.carrito.length).toBe(1);
    fixture.destroy();
    const next = TestBed.createComponent(ProductosComponent);
    expect(next.componentInstance.carrito.length).toBe(1);
    theme.setPreference(previous);
  });

  it("renders distinct loading, empty, recoverable error and data states with explicit retry", () => {
    const fixture = TestBed.createComponent(RequestStateComponent);
    const retry = spyOn(fixture.componentInstance.retry, "emit");
    fixture.componentRef.setInput("state", { status: "loading" });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[aria-busy="true"]'),
    ).not.toBeNull();
    fixture.componentRef.setInput("state", { status: "empty" });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("No hay resultados");
    fixture.componentRef.setInput("state", {
      status: "error",
      error: { kind: "network", message: "Offline", retryable: true },
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain("Offline");
    fixture.nativeElement.querySelector("button").click();
    expect(retry).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput("state", { status: "data", data: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector("button")).toBeNull();
  });
});

describe("Uncertain payment recovery", () => {
  beforeEach(() => localStorage.removeItem("espacio_gym_carrito"));
  afterEach(() => localStorage.removeItem("espacio_gym_carrito"));

  it("keeps the cart and prevents a second charge while Stripe confirmation is pending or unconfirmed", async () => {
    const confirmCardPayment = jasmine
      .createSpy("confirmCardPayment")
      .and.resolveTo({
        paymentIntent: { id: "pi_unit_1", status: "succeeded" },
      });
    const stripeMock = buildStripeMock(confirmCardPayment);
    const registrarPago = jasmine.createSpy("registrarPago");
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: STRIPE_LOADER, useValue: () => Promise.resolve(stripeMock.stripe) },
        {
          provide: BILLING,
          useValue: {
            pagos$: of([]),
            registrarPago,
            marcarComoPagado: () => {},
            cancelarPago: () => {},
          },
        },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const cart = TestBed.inject(CartStore);
    cart.add({
      id: 1,
      nombre: "Unit",
      descripcion: "Unit",
      precio: 150,
      imagen: "unit",
      categoria: "proteina",
    });
    const adapter = TestBed.inject(StripeCheckoutAdapter);
    await adapter.mountCardElement(document.createElement("div"));
    stripeMock.markComplete();

    const firstAttempt = adapter.processPayment({ holderName: "Unit User" });
    expect(adapter.pending()).toBeTrue();
    expect(await adapter.processPayment({ holderName: "Unit User" })).toBeNull();

    const intentReq = http.expectOne((r) =>
      r.url.endsWith("/api/stripe/create-payment-intent"),
    );
    intentReq.flush({
      exito: true,
      clientSecret: "pi_sec_1",
      paymentIntentId: "pi_unit_1",
      precioFinal: 150,
    });
    await Promise.resolve();
    await Promise.resolve();

    const confirmReq = http.expectOne((r) =>
      r.url.endsWith("/api/stripe/confirm-payment"),
    );
    expect(confirmReq.request.body.type).toBe("product");
    confirmReq.flush({ ok: false, status: "PENDING" });

    expect(await firstAttempt).toBeNull();
    expect(cart.items().length).toBe(1);
    expect(adapter.state()).toBe("pending");
    expect(registrarPago).not.toHaveBeenCalled();

    expect(await adapter.processPayment({ holderName: "Unit User" })).toBeNull();
    http.expectNone((r) => r.url.endsWith("/api/stripe/create-payment-intent"));
    http.verify();
  });

  it("retains the cart when Stripe declines a card and allows retrying", async () => {
    const confirmCardPayment = jasmine
      .createSpy("confirmCardPayment")
      .and.returnValues(
        Promise.resolve({ error: { message: "Fondos insuficientes" } }),
        Promise.resolve({
          paymentIntent: { id: "pi_retry_1", status: "succeeded" },
        }),
      );
    const stripeMock = buildStripeMock(confirmCardPayment);
    const registrarPago = jasmine.createSpy("registrarPago").and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: STRIPE_LOADER, useValue: () => Promise.resolve(stripeMock.stripe) },
        {
          provide: BILLING,
          useValue: {
            pagos$: of([]),
            registrarPago,
            marcarComoPagado: () => {},
            cancelarPago: () => {},
          },
        },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const cart = TestBed.inject(CartStore);
    cart.add({
      id: 1,
      nombre: "Unit",
      descripcion: "Unit",
      precio: 150,
      imagen: "unit",
      categoria: "proteina",
    });
    const adapter = TestBed.inject(StripeCheckoutAdapter);
    await adapter.mountCardElement(document.createElement("div"));
    stripeMock.markComplete();

    const declined = adapter.processPayment({ holderName: "Unit User" });
    http
      .expectOne((r) => r.url.endsWith("/api/stripe/create-payment-intent"))
      .flush({
        exito: true,
        clientSecret: "pi_sec_declined",
        paymentIntentId: "pi_declined",
        precioFinal: 150,
      });

    expect(await declined).toBeNull();
    expect(cart.items().length).toBe(1);
    expect(adapter.state()).toBe("error");
    expect(adapter.message()).toContain("Fondos insuficientes");
    expect(registrarPago).not.toHaveBeenCalled();

    const retry = adapter.processPayment({ holderName: "Unit User" });
    http
      .expectOne((r) => r.url.endsWith("/api/stripe/create-payment-intent"))
      .flush({
        exito: true,
        clientSecret: "pi_sec_retry",
        paymentIntentId: "pi_retry_1",
        precioFinal: 150,
      });
    await Promise.resolve();
    await Promise.resolve();

    http
      .expectOne((r) => r.url.endsWith("/api/stripe/confirm-payment"))
      .flush({ ok: true, folio: "STR-112233", paymentIntentId: "pi_retry_1" });
    const receipt = await retry;

    expect(receipt?.folio).toBe("STR-112233");
    expect(cart.items().length).toBe(0);
    expect(adapter.state()).toBe("complete");
    expect(registrarPago).toHaveBeenCalledTimes(1);
    http.verify();
  });
});
