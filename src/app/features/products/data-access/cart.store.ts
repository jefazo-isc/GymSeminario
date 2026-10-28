import { computed, Injectable, signal } from "@angular/core";
import { CartLine, cartTotal } from "../models/cart.model";
import { Producto } from "../models/producto.model";
/** Session memory only: changing theme or navigating does not clear the cart. Reload does. */
@Injectable({ providedIn: "root" })
export class CartStore {
  private readonly state = signal<Producto[]>([]);
  readonly items = this.state.asReadonly();
  readonly total = computed(() => cartTotal(this.state()));
  readonly lines = computed(() => {
    const lines = new Map<number, CartLine>();
    for (const item of this.state()) {
      const line = lines.get(item.id);
      if (line) line.quantity++;
      else lines.set(item.id, { product: item, quantity: 1 });
    }
    return [...lines.values()];
  });
  add(product: Producto) {
    this.state.update((items) => [...items, { ...product }]);
  }
  removeIndex(index: number) {
    this.state.update((items) => items.filter((_, i) => i !== index));
  }
  removeProduct(id: number) {
    this.state.update((items) => items.filter((p) => p.id !== id));
  }
  changeQuantity(product: Producto, delta: number) {
    if (delta > 0) this.add(product);
    else {
      const index = this.state().findIndex((p) => p.id === product.id);
      if (index >= 0) this.removeIndex(index);
    }
  }
  clear() {
    this.state.set([]);
  }
}
