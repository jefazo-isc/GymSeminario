import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, Subject } from "rxjs";
import Swal from "sweetalert2";
import { COURSES } from "../../features/courses/data-access/course.repository";
import { Curso } from "../../features/courses/models/course.model";
import { BuscarComponent } from "../../features/courses/pages/buscar/buscar.component";
import { PRODUCT_CATALOG } from "../../features/products/data-access/product-catalog.repository";
import { Producto } from "../../features/products/models/producto.model";
import { ProductosComponent } from "../../features/products/pages/productos/productos.component";
import { PROFILES } from "../../features/profile/data-access/profile.repository";
import { createProfileDraft } from "../../features/profile/models/profile.model";
import { MicuentaComponent } from "../../features/profile/pages/micuenta/micuenta.component";
import { SESSION } from "../../features/auth/data-access/session.repository";
import { BILLING } from "../../features/billing/data-access/billing.repository";
import { Pago } from "../../features/billing/models/pago.model";
import { EstadoCuentaComponent } from "../../features/billing/pages/estado-cuenta/estado-cuenta.component";

describe("Adapters with delayed remote-like confirmation", () => {
  it("does not display a failed course request as an empty successful catalog", () => {
    const response = new Subject<Curso[]>();
    const catalog = jasmine.createSpy().and.returnValue(response);
    TestBed.configureTestingModule({
      imports: [BuscarComponent],
      providers: [
        provideRouter([]),
        { provide: COURSES, useValue: { loadCatalog: catalog } },
      ],
    });
    const fixture = TestBed.createComponent(BuscarComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading).toBeTrue();
    expect(fixture.nativeElement.textContent).not.toContain(
      "No encontramos ese curso.",
    );
    response.error(new Error("Offline"));
    fixture.detectChanges();
    expect(fixture.componentInstance.error).toContain("catálogo");
    catalog.and.returnValue(
      of([
        {
          id: 1,
          nombre: "Unit",
          duracion: "1h",
          img: "unit",
          descripcion: "Unit",
        },
      ]),
    );
    fixture.componentInstance.loadCatalog();
    fixture.detectChanges();
    expect(fixture.componentInstance.loading).toBeFalse();
    expect(fixture.componentInstance.resultados.length).toBe(1);
  });
  it("accepts an asynchronous product catalog without losing filters or touching the cart", () => {
    const response = new Subject<Producto[]>();
    TestBed.configureTestingModule({
      imports: [ProductosComponent],
      providers: [
        provideRouter([]),
        {
          provide: PRODUCT_CATALOG,
          useValue: { loadProducts: () => response },
        },
      ],
    });
    const component =
      TestBed.createComponent(ProductosComponent).componentInstance;
    component.query = "Selected";
    expect(component.catalogLoading).toBeTrue();
    response.next([
      {
        id: 2,
        nombre: "Selected unit",
        descripcion: "Unit",
        imagen: "unit",
        precio: 12,
        categoria: "proteina",
      },
    ]);
    expect(component.catalogLoading).toBeFalse();
    expect(component.filtered.length).toBe(1);
    expect(component.query).toBe("Selected");
    expect(component.carrito.length).toBe(0);
  });
  it("waits for profile persistence and prevents a second save while it is pending", async () => {
    let complete!: () => void;
    const save = jasmine
      .createSpy()
      .and.returnValue(new Promise<void>((resolve) => (complete = resolve)));
    TestBed.configureTestingModule({
      imports: [MicuentaComponent],
      providers: [
        provideRouter([]),
        {
          provide: PROFILES,
          useValue: { perfil$: of(createProfileDraft()), guardarPerfil: save },
        },
        {
          provide: SESSION,
          useValue: {
            userName$: of(null),
            userRole$: of(null),
            getCurrentUser: () => Promise.resolve(null),
          },
        },
      ],
    });
    const component =
      TestBed.createComponent(MicuentaComponent).componentInstance;
    const operation = component.guardarDatos();
    await component.guardarDatos();
    expect(save.calls.count()).toBe(1);
    expect(component.saving).toBeTrue();
    expect(component.guardadoExitoso).toBeFalse();
    expect(component.saveMessage).toBe("");
    complete();
    await operation;
    expect(component.saving).toBeFalse();
    expect(component.guardadoExitoso).toBeTrue();
  });
  it("waits for the billing adapter before reporting a saved annotation", async () => {
    let complete!: (payment: Pago) => void;
    const save = jasmine
      .createSpy()
      .and.returnValue(new Promise<Pago>((resolve) => (complete = resolve)));
    spyOn(Swal, "fire").and.resolveTo({
      isConfirmed: true,
      isDenied: false,
      isDismissed: false,
    });
    TestBed.configureTestingModule({
      imports: [EstadoCuentaComponent],
      providers: [
        provideRouter([]),
        { provide: BILLING, useValue: { pagos$: of([]), registrarPago: save } },
      ],
    });
    const component = TestBed.createComponent(
      EstadoCuentaComponent,
    ).componentInstance;
    const operation = component.registrarPago();
    await Promise.resolve();
    expect(component.busy).toBeTrue();
    expect(component.feedback).toBe("");
    complete({
      id: "unit",
      folio: "UNIT-CONFIRMED",
      concepto: "Mensualidad",
      monto: 550,
      metodo: "Efectivo",
      estado: "Pagado",
      fecha: "2026-10-27",
    });
    await operation;
    expect(component.busy).toBeFalse();
    expect(component.feedback).toContain("UNIT-CONFIRMED");
  });
});
