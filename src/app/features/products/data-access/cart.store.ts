import { computed, inject, Injectable, signal } from "@angular/core";
import { BrowserStorage } from "../../../core/storage/browser-storage.service";
import {
  isFiniteNumber,
  isList,
  isRecord,
  isString,
} from "../../../core/storage/storage-guards";
import { CartLine, cartTotal } from "../models/cart.model";
import { Producto } from "../models/producto.model";

const CART_STORAGE_KEY = "espacio_gym_carrito";
const VALID_CATEGORIES = new Set([
  "proteina",
  "creatina",
  "preentreno",
  "accesorio",
  "ropa",
]);

const isProducto = (value: unknown): value is Producto =>
  isRecord(value) &&
  isFiniteNumber(value["id"]) &&
  isString(value["nombre"]) &&
  isString(value["descripcion"]) &&
  isFiniteNumber(value["precio"]) &&
  isString(value["imagen"]) &&
  isString(value["categoria"]) &&
  VALID_CATEGORIES.has(value["categoria"]);

/** Persisted in BrowserStorage via guarded schema so cart survives reloads safely. */
@Injectable({ providedIn: "root" })
export class CartStore {
  private readonly storage = inject(BrowserStorage);
  private readonly state = signal<Producto[]>(
    this.storage.read(CART_STORAGE_KEY, isList(isProducto), () => []),
  );
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
    this.commit([...this.state(), { ...product }]);
  }

  removeIndex(index: number) {
    this.commit(this.state().filter((_, i) => i !== index));
  }

  removeProduct(id: number) {
    this.commit(this.state().filter((p) => p.id !== id));
  }

  changeQuantity(product: Producto, delta: number) {
    if (delta > 0) this.add(product);
    else {
      const index = this.state().findIndex((p) => p.id === product.id);
      if (index >= 0) this.removeIndex(index);
    }
  }

  clear() {
    this.commit([]);
  }

  private commit(next: Producto[]) {
    this.state.set(next);
    try {
      this.storage.write(CART_STORAGE_KEY, next);
    } catch {
      /* Storage unavailable or protected against future schema; keep visit state in memory. */
    }
  }
}
