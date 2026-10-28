import { Dialog, DialogModule, DialogRef } from "@angular/cdk/dialog";
import { BreakpointObserver } from "@angular/cdk/layout";
import { Overlay } from "@angular/cdk/overlay";
import { CommonModule } from "@angular/common";
import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  inject,
  Injector,
  TemplateRef,
} from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { map } from "rxjs";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { RequestState } from "../../../../core/data-access/request-state";
import { RequestStateComponent } from "../../../../shared/ui/request-state/request-state.component";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { CartStore } from "../../data-access/cart.store";
import { PayPalCheckoutAdapter } from "../../data-access/paypal-checkout.adapter";
import { PRODUCT_CATALOG } from "../../data-access/product-catalog.repository";
import { Producto } from "../../models/producto.model";
export { cartTotal } from "../../models/cart.model";

@Component({
  selector: "app-productos",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    IconComponent,
    ButtonDirective,
    RequestStateComponent,
  ],
  templateUrl: "./productos.component.html",
  styleUrl: "./productos.component.css",
})
export class ProductosComponent {
  private readonly cart = inject(CartStore);
  private readonly checkout = inject(PayPalCheckoutAdapter);
  private readonly catalog = inject(PRODUCT_CATALOG);
  private readonly destroyRef = inject(DestroyRef);
  productos: Producto[] = [];
  catalogLoading = false;
  catalogError = "";

  private injector = inject(Injector);
  private dialog = inject(Dialog);
  private overlay = inject(Overlay);
  private drawer?: DialogRef;
  readonly compact = toSignal(
    inject(BreakpointObserver)
      .observe("(max-width:1023px)")
      .pipe(map((result) => result.matches)),
    { initialValue: false },
  );
  get carrito() {
    return this.cart.items();
  }
  get total() {
    return this.cart.total();
  }
  query = "";
  category = "";
  sort = "featured";
  cartOpen = false;
  reviewed = false;
  get checkoutPending() {
    return this.checkout.pending();
  }
  get paymentState() {
    return this.checkout.state();
  }
  get paymentMessage() {
    return this.checkout.message();
  }
  feedback = "";
  readonly categories = [
    { value: "proteina", label: "Proteínas", fragment: "proteinas" },
    { value: "creatina", label: "Creatinas", fragment: "creatinas" },
    { value: "preentreno", label: "Preentrenos", fragment: "preentrenos" },
    { value: "accesorio", label: "Accesorios", fragment: "accesorios" },
    { value: "ropa", label: "Ropa", fragment: "ropa" },
  ];
  constructor() {
    this.loadProducts();
    inject(ActivatedRoute)
      .fragment.pipe(takeUntilDestroyed())
      .subscribe((fragment) => {
        const item = this.categories.find((c) => c.fragment === fragment);
        if (item) this.category = item.value;
      });
    effect(() => {
      if (!this.compact() && this.cartOpen) this.drawer?.close();
      this.schedulePayPal();
    });
    inject(DestroyRef).onDestroy(() => {
      this.drawer?.close();
      this.closePayPal();
    });
  }
  get catalogState(): RequestState<Producto[]> {
    if (this.catalogLoading) return { status: "loading" };
    if (this.catalogError)
      return {
        status: "error",
        error: { kind: "network", message: this.catalogError, retryable: true },
      };
    return { status: "data", data: this.productos };
  }
  loadProducts() {
    if (this.catalogLoading) return;
    this.catalogLoading = true;
    this.catalogError = "";
    this.catalog
      .loadProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.productos = products;
          this.catalogLoading = false;
        },
        error: () => {
          this.catalogLoading = false;
          this.catalogError =
            "No se pudo consultar el catálogo. Conservamos tu carrito y filtros.";
        },
      });
  }
  get filtered() {
    const query = this.query.toLocaleLowerCase("es").trim();
    const list = this.productos.filter(
      (p) =>
        (!this.category || p.categoria === this.category) &&
        (!query ||
          (p.nombre + " " + p.descripcion)
            .toLocaleLowerCase("es")
            .includes(query)),
    );
    return this.sort === "price-asc"
      ? list.sort((a, b) => a.precio - b.precio)
      : this.sort === "price-desc"
        ? list.sort((a, b) => b.precio - a.precio)
        : this.sort === "name"
          ? list.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
          : list;
  }
  get cartLines() {
    return this.cart.lines();
  }
  agregarAlCarrito(product: Producto) {
    if (this.checkoutPending) return;
    this.cart.add(product);
    this.calcularTotal();
    this.feedback = product.nombre + " añadido al carrito.";
  }
  eliminarDelCarrito(index: number) {
    if (this.checkoutPending) return;
    this.cart.removeIndex(index);
    this.calcularTotal();
  }
  changeQuantity(product: Producto, delta: number) {
    if (this.checkoutPending) return;
    this.cart.changeQuantity(product, delta);
    this.calcularTotal();
  }
  removeProduct(id: number) {
    if (this.checkoutPending) return;
    this.cart.removeProduct(id);
    this.calcularTotal();
  }
  calcularTotal() {
    this.reviewed = false;
    this.checkout.resetReview();
    this.closePayPal();
    this.schedulePayPal();
  }
  imageError(event: Event) {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith("product-placeholder.svg"))
      image.src = "img/product-placeholder.svg";
  }
  openCart(template: TemplateRef<unknown>) {
    if (this.cartOpen) return;
    this.cartOpen = true;
    this.drawer = this.dialog.open(template, {
      width: "min(440px,100vw)",
      height: "100dvh",
      maxWidth: "100vw",
      panelClass: ["grom-dialog", "grom-dialog--mobile"],
      backdropClass: "grom-backdrop",
      ariaLabelledBy: "cart-title",
      autoFocus: ".cart-close",
      restoreFocus: true,
      positionStrategy: this.overlay.position().global().top("0").right("0"),
    });
    this.drawer.closed.subscribe(() => {
      this.cartOpen = false;
      this.closePayPal();
    });
    this.schedulePayPal();
  }
  closeCart() {
    if (!this.checkoutPending) this.drawer?.close();
  }
  reviewCheckout() {
    this.schedulePayPal();
  }
  private schedulePayPal() {
    afterNextRender(() => this.renderPayPalButton(), {
      injector: this.injector,
    });
  }
  private closePayPal() {
    this.checkout.close();
  }
  async renderPayPalButton() {
    const container = document.getElementById("paypal-button-container");
    if (!container || !this.carrito.length || !this.reviewed) return;
    await this.checkout.render(container);
    if (!this.carrito.length) this.reviewed = false;
  }
}
