import { Dialog, DialogModule, DialogRef } from "@angular/cdk/dialog";
import { BreakpointObserver } from "@angular/cdk/layout";
import { Overlay } from "@angular/cdk/overlay";
import { CommonModule } from "@angular/common";
import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  TemplateRef,
  ViewChild,
} from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { map } from "rxjs";
import { RequestState } from "../../../../core/data-access/request-state";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { RequestStateComponent } from "../../../../shared/ui/request-state/request-state.component";
import { CartStore } from "../../data-access/cart.store";
import { PRODUCT_CATALOG } from "../../data-access/product-catalog.repository";
import { StripeCheckoutAdapter } from "../../data-access/stripe-checkout.adapter";
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
  private readonly checkout = inject(StripeCheckoutAdapter);
  private readonly catalog = inject(PRODUCT_CATALOG);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  @ViewChild("stripeCardMount") stripeCardMount?: ElementRef<HTMLDivElement>;

  productos: Producto[] = [];
  catalogLoading = false;
  catalogError = "";

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
  get finalTotal() {
    return this.checkout.finalAmount();
  }
  get activeCoupon() {
    return this.checkout.activeCoupon();
  }
  get couponError() {
    return this.checkout.couponError();
  }
  get isCourtesyBypass() {
    return this.checkout.isCourtesyBypass();
  }
  get lastReceipt() {
    return this.checkout.lastReceipt();
  }
  get cardError() {
    return this.checkout.cardError();
  }
  get isAdmin(): boolean {
    return this.catalog.isAdmin?.() ?? false;
  }

  query = "";
  category = "";
  sort = "featured";
  cartOpen = false;
  reviewed = false;
  couponCode = "";
  cardHolder = "";

  editingProductId: number | null = null;
  adminFormOpen = false;
  adminBusy = false;
  adminMessage = "";
  adminForm: Omit<Producto, "id"> = {
    nombre: "",
    descripcion: "",
    precio: 500,
    imagen: "",
    categoria: "proteina",
  };

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
    });
    this.destroyRef.onDestroy(() => {
      this.drawer?.close();
      this.checkout.unmountCardElement();
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
      this.checkout.unmountCardElement();
    });
    if (this.reviewed && !this.isCourtesyBypass) {
      this.scheduleStripeMount();
    }
  }

  closeCart() {
    if (!this.checkoutPending) this.drawer?.close();
  }

  reviewCheckout() {
    if (this.reviewed) {
      this.checkout.prepareCheckout();
      if (!this.isCourtesyBypass) {
        this.scheduleStripeMount();
      }
    } else {
      this.checkout.resetReview();
    }
  }

  applyCoupon() {
    const applied = this.checkout.applyCoupon(this.couponCode);
    if (!applied || applied.precioFinal > 0) {
      if (this.reviewed) {
        this.scheduleStripeMount();
      }
    }
  }

  removeCoupon() {
    this.couponCode = "";
    this.checkout.clearCoupon();
    if (this.reviewed) {
      this.scheduleStripeMount();
    }
  }

  private scheduleStripeMount() {
    afterNextRender(
      () => {
        const target = this.stripeCardMount?.nativeElement;
        if (target && this.reviewed && !this.isCourtesyBypass) {
          void this.checkout.mountCardElement(target);
        }
      },
      { injector: this.injector },
    );
  }

  async submitStripePayment() {
    const receipt = await this.checkout.processPayment({
      holderName: this.cardHolder,
    });
    if (receipt) {
      this.reviewed = false;
      this.couponCode = "";
    }
  }

  cancelStripeCheckout() {
    this.reviewed = false;
    this.checkout.cancelCheckout();
  }

  startNewProduct() {
    this.editingProductId = null;
    this.adminFormOpen = true;
    this.adminMessage = "";
    this.adminForm = {
      nombre: "",
      descripcion: "",
      precio: 500,
      imagen: "img/product-placeholder.svg",
      categoria: "proteina",
    };
  }

  editProduct(product: Producto) {
    this.editingProductId = product.id;
    this.adminFormOpen = true;
    this.adminMessage = "";
    this.adminForm = {
      nombre: product.nombre,
      descripcion: product.descripcion,
      precio: product.precio,
      imagen: product.imagen,
      categoria: product.categoria,
    };
  }

  cancelAdminEdit() {
    this.adminFormOpen = false;
    this.editingProductId = null;
  }

  async saveAdminProduct() {
    if (this.adminBusy || !this.isAdmin) return;
    if (!this.adminForm.nombre.trim() || this.adminForm.precio <= 0) {
      this.adminMessage = "Ingresa un nombre y precio mayor a cero.";
      return;
    }
    this.adminBusy = true;
    this.adminMessage = "";
    try {
      if (this.editingProductId !== null && this.catalog.updateProduct) {
        const updated = await this.catalog.updateProduct(
          this.editingProductId,
          { ...this.adminForm },
        );
        this.productos = this.productos.map((p) =>
          p.id === this.editingProductId ? { ...p, ...updated } : p,
        );
        this.adminMessage = "Producto actualizado en catálogo.";
      } else if (this.catalog.createProduct) {
        const created = await this.catalog.createProduct({ ...this.adminForm });
        this.productos = [created, ...this.productos];
        this.adminMessage = "Producto añadido al catálogo.";
      }
      this.adminFormOpen = false;
      this.editingProductId = null;
    } catch {
      this.adminMessage = "No se pudo guardar el producto en el servidor.";
    } finally {
      this.adminBusy = false;
    }
  }

  async deleteAdminProduct(id: number) {
    if (this.adminBusy || !this.isAdmin || !this.catalog.deleteProduct) return;
    this.adminBusy = true;
    this.adminMessage = "";
    try {
      await this.catalog.deleteProduct(id);
      this.productos = this.productos.filter((p) => p.id !== id);
      this.adminMessage = "Producto eliminado del catálogo.";
    } catch {
      this.adminMessage = "No se pudo eliminar el producto en el servidor.";
    } finally {
      this.adminBusy = false;
    }
  }
}
