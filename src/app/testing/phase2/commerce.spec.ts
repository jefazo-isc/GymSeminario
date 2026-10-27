import { TestBed } from "@angular/core/testing";
import { NgZone } from '@angular/core';
import { provideRouter } from "@angular/router";
import {
  MembresiasComponent,
  demoPrice,
} from "../../components/membresias/membresias.component";
import { MembresiaService } from "../../services/membresia.service";
import {
  ProductosComponent,
  cartTotal,
} from "../../components/productos/productos.component";
import { escapeHtml } from "../../shared/ui/escape-html";
import Swal from "sweetalert2";

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
  let oldPayPal: any;
  beforeEach(() => {
    oldPayPal = (window as any).paypal;
    TestBed.configureTestingModule({
      imports: [ProductosComponent],
      providers: [provideRouter([])],
    }).overrideComponent(ProductosComponent, {
      set: {
          template: '<div id="paypal-button-container"></div><span class="sdk-feedback">{{paymentMessage}}</span>',
        imports: [],
      },
    });
  });
  afterEach(() => {
    (window as any).paypal = oldPayPal;
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
  it('renders cancellation feedback from a provider callback outside the Angular zone',async()=>{
    let callbacks:any;
    (window as any).paypal={Buttons:(options:any)=>{callbacks=options;return {render:()=>Promise.resolve(),close:()=>Promise.resolve()};}};
    const fixture=TestBed.createComponent(ProductosComponent);
    fixture.autoDetectChanges();
    const component=fixture.componentInstance;
    component.agregarAlCarrito(component.productos[0]);component.reviewed=true;
    await component.renderPayPalButton();
    TestBed.inject(NgZone).runOutsideAngular(()=>callbacks.onCancel());
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.sdk-feedback').textContent).toContain('se canceló');
    expect(component.carrito.length).toBe(1);
  });
  it("shows unavailable instead of throwing when the payment SDK is missing", async () => {
    (window as any).paypal = undefined;
    const fixture = TestBed.createComponent(ProductosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.agregarAlCarrito(component.productos[0]);
    component.reviewed = true;
    await component.renderPayPalButton();
    expect(component.paymentState).toBe("unavailable");
    expect(component.carrito.length).toBe(1);
  });
  it("keeps the amount contract and retains the cart until PayPal reports COMPLETED", async () => {
    let callbacks: any;
    const render = jasmine.createSpy().and.resolveTo();
    (window as any).paypal = {
      Buttons: (options: any) => {
        callbacks = options;
        return { render, close: () => Promise.resolve() };
      },
    };
    const fixture = TestBed.createComponent(ProductosComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.agregarAlCarrito(component.productos[0]);
    component.changeQuantity(component.productos[0], 1);
    component.reviewed = true;
    await component.renderPayPalButton();
    const create = jasmine.createSpy().and.resolveTo({ id: "UNIT-ORDER" });
    await callbacks.createOrder({}, { order: { create } });
    expect(create).toHaveBeenCalledWith({
      purchase_units: [{ amount: { value: "2.00" } }],
    });
    await callbacks.onApprove(
      {},
      {
        order: {
          capture: () =>
            Promise.resolve({ status: "PENDING", id: "UNIT-ORDER" }),
        },
      },
    );
    expect(component.carrito.length).toBe(2);
    expect(component.paymentState).toBe("pending");
    await callbacks.onApprove(
      {},
      {
        order: {
          capture: () =>
            Promise.resolve({ status: "COMPLETED", id: "UNIT-ORDER" }),
        },
      },
    );
    expect(component.carrito.length).toBe(0);
    expect(component.total).toBe(0);
  });
});

describe("Local receipt safety", () => {
  it("escapes free text instead of allowing markup in a receipt", () => {
    expect(escapeHtml("<script>\"&'</script>")).toBe(
      "&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;",
    );
  });
});
