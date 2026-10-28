import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { User } from "firebase/auth";
import { of } from "rxjs";
import { routes } from "../../app.routes";
import { ThemeService } from "../../core/theme/theme.service";
import {
  SESSION,
  SessionRepository,
} from "../../features/auth/data-access/session.repository";
import { COURSES } from "../../features/courses/data-access/course.repository";
import { BuscarComponent } from "../../features/courses/pages/buscar/buscar.component";
import { CartStore } from "../../features/products/data-access/cart.store";
import { PayPalCheckoutAdapter } from "../../features/products/data-access/paypal-checkout.adapter";
import { PayPalSdkLoader } from "../../features/products/data-access/paypal-sdk.loader";
import { PayPalButtonOptions } from "../../features/products/models/paypal.model";
import { ProductosComponent } from "../../features/products/pages/productos/productos.component";
import {
  TRAINING,
  TrainingRepository,
} from "../../features/training/data-access/training.repository";
import { Formulario2Component } from "../../features/training/pages/formulario2/formulario2.component";
import { RequestStateComponent } from "../../shared/ui/request-state/request-state.component";

describe("Confirmed record and independent notification", () => {
  let repository: jasmine.SpyObj<TrainingRepository>;
  beforeEach(() => {
    repository = jasmine.createSpyObj<TrainingRepository>("training", [
      "createBooking",
      "notifyBooking",
    ]);
    repository.createBooking.and.resolveTo({ id: "confirmed-unit" });
    repository.notifyBooking.and.rejectWith(new Error("Notification offline"));
    const user = {
      uid: "unit",
      displayName: "Unit",
      email: "unit@example.test",
      phoneNumber: null,
    } as User;
    TestBed.configureTestingModule({
      imports: [Formulario2Component],
      providers: [
        provideRouter([]),
        { provide: TRAINING, useValue: repository },
        {
          provide: SESSION,
          useValue: {
            getCurrentUser: () => Promise.resolve(user),
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
  it("keeps every concrete URL and defers feature component loading", () => {
    const concrete = routes.filter(
      (route) => route.path && route.path !== "auth" && !route.redirectTo,
    );
    expect(concrete.length).toBe(26);
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
  it("keeps cart and filters when the theme changes and cart when the page is recreated", () => {
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
  it("keeps the cart and prevents a second order after an unconfirmed provider capture", async () => {
    let callbacks!: PayPalButtonOptions;
    const loader = {
      load: () =>
        Promise.resolve({
          Buttons: (options: PayPalButtonOptions) => {
            callbacks = options;
            return {
              render: () => Promise.resolve(),
              close: () => Promise.resolve(),
            };
          },
        }),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: PayPalSdkLoader, useValue: loader }],
    });
    const cart = TestBed.inject(CartStore);
    cart.add({
      id: 1,
      nombre: "Unit",
      descripcion: "Unit",
      precio: 1,
      imagen: "unit",
      categoria: "proteina",
    });
    const adapter = TestBed.inject(PayPalCheckoutAdapter);
    await adapter.render(document.createElement("div"));
    const create = jasmine.createSpy().and.resolveTo("UNIT");
    const capture = jasmine
      .createSpy()
      .and.resolveTo({ id: "UNIT", status: "PENDING" });
    const actions = { order: { create, capture } };
    await callbacks.createOrder({}, actions);
    await callbacks.onApprove({}, actions);
    expect(cart.items().length).toBe(1);
    expect(adapter.state()).toBe("pending");
    expect(() => callbacks.createOrder({}, actions)).toThrow();
    expect(create.calls.count()).toBe(1);
  });
});
