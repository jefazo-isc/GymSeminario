import {
  Component,
  inject,
  TemplateRef,
  Injector,
  afterNextRender,
  effect,
  DestroyRef,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { Dialog, DialogModule, DialogRef } from "@angular/cdk/dialog";
import { Overlay } from "@angular/cdk/overlay";
import { BreakpointObserver } from "@angular/cdk/layout";
import { toSignal, takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { map } from "rxjs";
import { Producto } from "../../models/producto.model";
import { IconComponent } from "../../shared/ui/icon/icon.component";
import { ButtonDirective } from "../../shared/ui/button.directive";
declare const paypal: any;
export function cartTotal(items: Producto[]): number {
  return items.reduce((sum, item) => sum + item.precio, 0);
}
@Component({
  selector: "app-productos",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    IconComponent,
    ButtonDirective,
  ],
  templateUrl: "./productos.component.html",
  styleUrl: "./productos.component.css",
})
export class ProductosComponent {
  productos: Producto[] = [
    // 8 Proteínas (Gymshark, YoungLA, Optimum Nutrition, Myprotein)
    {
      id: 1,
      nombre: "Gymshark Whey Protein",
      descripcion: "Proteína de suero premium Gymshark",
      precio: 1,
      imagen: "https://m.media-amazon.com/images/I/51+1dK5TL6L._AC_SX679_.jpg",
      categoria: "proteina",
    },
    {
      id: 2,
      nombre: "YoungLA Protein Blend",
      descripcion: "Mezcla de proteínas YoungLA sabor chocolate",
      precio: 1400,
      imagen:
        "https://suplementosmty.com/cdn/shop/files/IMG-4793.jpg?v=1702078683",
      categoria: "proteina",
    },
    {
      id: 3,
      nombre: "Optimum Nutrition Gold Standard 100% Whey",
      descripcion: "Proteína clásica con gran reputación",
      precio: 1600,
      imagen:
        "https://m.media-amazon.com/images/I/71wWgr-umZL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "proteina",
    },
    {
      id: 4,
      nombre: "Myprotein Impact Whey Protein",
      descripcion: "Alta calidad y sabor",
      precio: 1300,
      imagen:
        "https://m.media-amazon.com/images/I/71QtLjCJEoL.__AC_SY300_SX300_QL70_ML2_.jpg",
      categoria: "proteina",
    },
    {
      id: 5,
      nombre: "Gymshark Vegan Protein",
      descripcion: "Proteína vegetal premium Gymshark",
      precio: 1550,
      imagen:
        "https://m.media-amazon.com/images/I/81JTsLHeabL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "proteina",
    },
    {
      id: 6,
      nombre: "Dymatize ISO100 Hydrolyzed",
      descripcion: "Proteína hidrolizada ultra pura",
      precio: 1800,
      imagen: "https://m.media-amazon.com/images/I/71jfRGW8UKL._AC_SX679_.jpg",
      categoria: "proteina",
    },
    {
      id: 7,
      nombre: "YoungLA Classic Protein",
      descripcion: "Proteína sabor vainilla",
      precio: 1400,
      imagen:
        "https://m.media-amazon.com/images/I/71BbxhrEYTL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "proteina",
    },
    {
      id: 8,
      nombre: "BSN Syntha-6 Protein",
      descripcion: "Mezcla de proteínas con sabor",
      precio: 1500,
      imagen:
        "https://m.media-amazon.com/images/I/81LCzECwIzL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "proteina",
    },

    // 8 Creatinas (Optimum, MuscleTech, Myprotein, Cellucor)
    {
      id: 9,
      nombre: "Optimum Nutrition Micronized Creatine",
      descripcion: "Creatina monohidrato micronizada",
      precio: 550,
      imagen: "https://m.media-amazon.com/images/I/61maAQ6fA1L._AC_SX679_.jpg",
      categoria: "creatina",
    },
    {
      id: 10,
      nombre: "MuscleTech Platinum Creatine",
      descripcion: "Creatina pura para potencia",
      precio: 600,
      imagen:
        "https://m.media-amazon.com/images/I/71O3oYyFxBL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "creatina",
    },
    {
      id: 11,
      nombre: "Myprotein Creatina Monohidrato",
      descripcion: "Creatina de alta calidad",
      precio: 520,
      imagen:
        "https://m.media-amazon.com/images/I/71B7W90YtTL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "creatina",
    },
    {
      id: 12,
      nombre: "Cellucor Cor-Performance Creatine",
      descripcion: "Apoya fuerza y recuperación",
      precio: 580,
      imagen:
        "https://m.media-amazon.com/images/I/61fS4Lp+CdL._AC_SY300_SX300_.jpg",
      categoria: "creatina",
    },
    {
      id: 13,
      nombre: "Creatina Creapure",
      descripcion: "Alta pureza alemana",
      precio: 650,
      imagen:
        "https://m.media-amazon.com/images/I/61D1tjM+bVL._AC_SY300_SX300_.jpg",
      categoria: "creatina",
    },
    {
      id: 14,
      nombre: "Universal Nutrition Creatine",
      descripcion: "Fuerza y resistencia",
      precio: 560,
      imagen:
        "https://m.media-amazon.com/images/I/414iFZbgx2L.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "creatina",
    },
    {
      id: 15,
      nombre: "Kaged Muscle Creatine HCl",
      descripcion: "Creatina HCl de alta absorción",
      precio: 700,
      imagen:
        "https://m.media-amazon.com/images/I/61mBp28SgvL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "creatina",
    },
    {
      id: 16,
      nombre: "Optimum Nutrition Creatine Capsules",
      descripcion: "Creatina en cápsulas",
      precio: 750,
      imagen:
        "https://m.media-amazon.com/images/I/41XGzzp1xnL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "creatina",
    },

    // 8 Pre-entrenos (C4, Legion Pulse, Optimum, Ghost)
    {
      id: 17,
      nombre: "Cellucor C4 Original",
      descripcion: "Pre-entreno popular y efectivo",
      precio: 800,
      imagen: "https://m.media-amazon.com/images/I/71toMEyF4jL._AC_SX679_.jpg",
      categoria: "preentreno",
    },
    {
      id: 18,
      nombre: "Legion Pulse",
      descripcion: "Pre-entreno con ingredientes naturales",
      precio: 950,
      imagen:
        "https://m.media-amazon.com/images/I/71IdSCqb1xL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "preentreno",
    },
    {
      id: 19,
      nombre: "Optimum Nutrition Gold Pre-Workout",
      descripcion: "Foco y energía",
      precio: 900,
      imagen:
        "https://m.media-amazon.com/images/I/71C6xWuT2oL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "preentreno",
    },
    {
      id: 20,
      nombre: "Ghost Legend",
      descripcion: "Pre-entreno con sabor",
      precio: 1000,
      imagen:
        "https://m.media-amazon.com/images/I/71nJKcwyysL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "preentreno",
    },
    {
      id: 21,
      nombre: "BSN N.O.-Xplode",
      descripcion: "Explosivo y duradero",
      precio: 850,
      imagen: "https://m.media-amazon.com/images/I/51SCA8HklRL._AC_SX679_.jpg",
      categoria: "preentreno",
    },
    {
      id: 22,
      nombre: "Kaged Muscle Pre-Kaged",
      descripcion: "Foco y resistencia",
      precio: 920,
      imagen:
        "https://m.media-amazon.com/images/I/81dE-FJT66L.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "preentreno",
    },
    {
      id: 23,
      nombre: "MuscleTech VaporX5",
      descripcion: "Pre-entreno clásico",
      precio: 870,
      imagen:
        "https://m.media-amazon.com/images/I/71nrqrrxwwL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "preentreno",
    },
    {
      id: 24,
      nombre: "Redcon1 Total War",
      descripcion: "Pre-entreno potente",
      precio: 980,
      imagen:
        "https://m.media-amazon.com/images/I/71TvvW8L7VL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "preentreno",
    },

    // 6 Accesorios (straps, guantes, cinturones)
    {
      id: 25,
      nombre: "Gymshark Straps",
      descripcion: "Straps para levantamiento",
      precio: 300,
      imagen:
        "https://m.media-amazon.com/images/I/71uR-wVYS4L.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "accesorio",
    },
    {
      id: 26,
      nombre: "YoungLA Guantes de Entrenamiento",
      descripcion: "Guantes para pesas",
      precio: 350,
      imagen:
        "https://site-product.innovasport.com/img-test/1369826-001/1369826-001_1-1200_x_1200.jpg",
      categoria: "accesorio",
    },
    {
      id: 27,
      nombre: "Cinturón de levantamiento",
      descripcion: "Soporte lumbar",
      precio: 400,
      imagen:
        "https://m.media-amazon.com/images/I/81XOlJpgjiL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "accesorio",
    },
    {
      id: 28,
      nombre: "Rodilleras deportivas",
      descripcion: "Protección para rodillas",
      precio: 280,
      imagen:
        "https://m.media-amazon.com/images/I/511C5UmC4-L.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "accesorio",
    },
    {
      id: 29,
      nombre: "Cuerda para saltar",
      descripcion: "Ideal para cardio",
      precio: 150,
      imagen:
        "https://m.media-amazon.com/images/I/41VPkyVIDrL.__AC_SY300_SX300_QL70_ML2_.jpg",
      categoria: "accesorio",
    },
    {
      id: 30,
      nombre: "Toalla deportiva Gymshark",
      descripcion: "Absorbe sudor",
      precio: 200,
      imagen:
        "https://m.media-amazon.com/images/I/71iyTznE3KL.__AC_SY300_SX300_QL70_ML2_.jpg",
      categoria: "accesorio",
    },

    // 10 Ropa (Gymshark, YoungLA, Nike, Adidas)
    {
      id: 31,
      nombre: "Camiseta Gymshark Training",
      descripcion: "Camiseta técnica",
      precio: 900,
      imagen:
        "https://cdn.shopify.com/s/files/1/0156/6146/files/GFXRestDay3RDEBoxyT-ShirtGSBlackA2B8H-BB2J-0968-0090_4a9deb70-4b68-4bca-a923-205089f6e612_3840x.jpg?v=1742894740",
      categoria: "ropa",
    },
    {
      id: 32,
      nombre: "Shorts YoungLA",
      descripcion: "Shorts deportivos cómodos",
      precio: 850,
      imagen:
        "https://ae-pic-a1.aliexpress-media.com/kf/Sfe8e2866a7974020abdcc25391d4072am.jpg_960x960q75.jpg_.avif",
      categoria: "ropa",
    },
    {
      id: 33,
      nombre: "Sudadera Nike Dri-FIT",
      descripcion: "Sudadera ligera",
      precio: 1200,
      imagen:
        "https://m.media-amazon.com/images/I/51+LeklyN5L._AC_SY300_SX300_.jpg",
      categoria: "ropa",
    },
    {
      id: 34,
      nombre: "Pantalón Adidas Training",
      descripcion: "Pantalón para entrenamiento",
      precio: 1100,
      imagen: "https://m.media-amazon.com/images/I/61Lo3u356gL._AC_SX679_.jpg",
      categoria: "ropa",
    },
    {
      id: 35,
      nombre: "Tank Top Gymshark",
      descripcion: "Sin mangas para entrenar",
      precio: 750,
      imagen:
        "https://cdn.shopify.com/s/files/1/1367/5207/files/PowerOriginalsCutOffTankGSBlackA2C9M-BB2J_1004_d757e053-32cf-4273-977b-476e66407bde_3840x.jpg?v=1741104503",
      categoria: "ropa",
    },
    {
      id: 36,
      nombre: "Joggers YoungLA",
      descripcion: "Joggers cómodos y estilizados",
      precio: 1000,
      imagen:
        "https://http2.mlstatic.com/D_NQ_NP_606361-MLM84544006589_052025-O-youngla-pants-revenge-joggers-original-.webp",
      categoria: "ropa",
    },
    {
      id: 37,
      nombre: "Sudadera con capucha Nike",
      descripcion: "Para días fríos",
      precio: 1300,
      imagen:
        "https://m.media-amazon.com/images/I/51cB8iGPJZL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "ropa",
    },
    {
      id: 38,
      nombre: "Camiseta Adidas Climalite",
      descripcion: "Tecnología para mantenerte fresco",
      precio: 900,
      imagen:
        "https://m.media-amazon.com/images/I/71RbhHjzPQL.__AC_SX300_SY300_QL70_ML2_.jpg",
      categoria: "ropa",
    },
    {
      id: 39,
      nombre: "Pantalones cortos Under Armour",
      descripcion: "Comodidad y rendimiento",
      precio: 850,
      imagen: "https://m.media-amazon.com/images/I/618TPqKNYyL._AC_SX679_.jpg",
      categoria: "ropa",
    },
    {
      id: 40,
      nombre: "Chaqueta deportiva YoungLA",
      descripcion: "Estilo y confort",
      precio: 1400,
      imagen:
        "https://http2.mlstatic.com/D_NQ_NP_622245-MLM81897706022_012025-O-youngla-anarchy-hoodie-sudadera-original-.webp",
      categoria: "ropa",
    },
  ];

  private injector = inject(Injector);
  private dialog = inject(Dialog);
  private overlay = inject(Overlay);
  private drawer?: DialogRef;
  private buttons: any;
  private renderGeneration = 0;
  readonly compact = toSignal(
    inject(BreakpointObserver)
      .observe("(max-width:1023px)")
      .pipe(map((result) => result.matches)),
    { initialValue: false },
  );
  carrito: Producto[] = [];
  total = 0;
  query = "";
  category = "";
  sort = "featured";
  cartOpen = false;
  reviewed = false;
  private readonly checkoutPendingState = signal(false);
  private readonly paymentStatus = signal('idle');
  private readonly paymentFeedback = signal('');
  // SDK callbacks can run outside Angular's zone. Signals schedule the UI update.
  get checkoutPending() { return this.checkoutPendingState(); }
  set checkoutPending(value:boolean) { this.checkoutPendingState.set(value); }
  get paymentState() { return this.paymentStatus(); }
  set paymentState(value:string) { this.paymentStatus.set(value); }
  get paymentMessage() { return this.paymentFeedback(); }
  set paymentMessage(value:string) { this.paymentFeedback.set(value); }
  feedback = "";
  readonly categories = [
    { value: "proteina", label: "Proteínas", fragment: "proteinas" },
    { value: "creatina", label: "Creatinas", fragment: "creatinas" },
    { value: "preentreno", label: "Preentrenos", fragment: "preentrenos" },
    { value: "accesorio", label: "Accesorios", fragment: "accesorios" },
    { value: "ropa", label: "Ropa", fragment: "ropa" },
  ];
  constructor() {
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
      this.renderGeneration++;
      this.drawer?.close();
      this.closePayPal();
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
    const lines = new Map<number, { product: Producto; quantity: number }>();
    for (const item of this.carrito) {
      const line = lines.get(item.id);
      if (line) line.quantity++;
      else lines.set(item.id, { product: item, quantity: 1 });
    }
    return [...lines.values()];
  }
  agregarAlCarrito(product: Producto) {
    if (this.checkoutPending) return;
    this.carrito.push(product);
    this.calcularTotal();
    this.feedback = product.nombre + " añadido al carrito.";
  }
  eliminarDelCarrito(index: number) {
    if (this.checkoutPending) return;
    this.carrito.splice(index, 1);
    this.calcularTotal();
  }
  changeQuantity(product: Producto, delta: number) {
    if (this.checkoutPending) return;
    if (delta > 0) this.carrito.push(product);
    else {
      const index = this.carrito.findIndex((p) => p.id === product.id);
      if (index >= 0) this.carrito.splice(index, 1);
    }
    this.calcularTotal();
  }
  removeProduct(id: number) {
    if (this.checkoutPending) return;
    this.carrito = this.carrito.filter((p) => p.id !== id);
    this.calcularTotal();
  }
  calcularTotal() {
    this.total = cartTotal(this.carrito);
    this.reviewed = false;
    this.paymentState = "idle";
    this.paymentMessage = "";
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
    this.renderGeneration++;
    try {
      const result = this.buttons?.close?.();
      result?.catch?.(() => {});
    } catch {}
    this.buttons = null;
  }
  async renderPayPalButton() {
    const container = document.getElementById("paypal-button-container");
    if (!container || !this.carrito.length || !this.reviewed) return;
    this.closePayPal();
    container.replaceChildren();
    if (typeof paypal === "undefined" || !paypal.Buttons) {
      this.paymentState = "unavailable";
      this.paymentMessage =
        "PayPal no está disponible. Revisa conexión o bloqueadores y vuelve a intentar. No se ha iniciado un cobro.";
      return;
    }
    const generation = ++this.renderGeneration;
    this.paymentState = "loading";
    try {
      this.buttons = paypal.Buttons({
        style: {
          layout: "vertical",
          color: "black",
          shape: "rect",
          label: "paypal",
        },
        createOrder: (_data: any, actions: any) => {
          this.checkoutPending = true;
          return actions.order
            .create({
              purchase_units: [{ amount: { value: this.total.toFixed(2) } }],
            })
            .catch((error: any) => {
              this.checkoutPending = false;
              throw error;
            });
        },
        onApprove: (_data: any, actions: any) =>
          actions.order
            .capture()
            .then((details: any) => {
              this.checkoutPending = false;
              if (details?.status === "COMPLETED") {
                this.carrito = [];
                this.total = 0;
                this.reviewed = false;
                this.paymentState = "complete";
                this.paymentMessage =
                  "PayPal confirmó la captura. Identificador: " +
                  (details.id || "consulta tu cuenta PayPal") +
                  ".";
                this.closePayPal();
              } else {
                this.paymentState = "pending";
                this.paymentMessage =
                  "PayPal no ha confirmado un pago completado. Revisa su estado en tu cuenta antes de iniciar otra operación.";
              }
            })
            .catch(() => {
              this.checkoutPending = false;
              this.paymentState = "error";
              this.paymentMessage =
                "No pudimos confirmar el resultado de PayPal. Consulta tu cuenta antes de volver a pagar.";
            }),
        onCancel: () => {
          this.checkoutPending = false;
          this.paymentMessage =
            "La operación de PayPal se canceló. Tu carrito se conserva.";
        },
        onError: () => {
          this.checkoutPending = false;
          this.paymentState = "error";
          this.paymentMessage =
            "PayPal no pudo completar la operación. Revisa el estado en tu cuenta antes de volver a intentar.";
        },
      });
      await this.buttons.render("#paypal-button-container");
      if (generation === this.renderGeneration) this.paymentState = "ready";
    } catch {
      if (generation === this.renderGeneration) {
        this.paymentState = "unavailable";
        this.paymentMessage =
          "No se pudo cargar el botón de PayPal. No se ha iniciado un cobro.";
      }
    }
  }
}
