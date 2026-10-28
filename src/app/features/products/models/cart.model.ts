import { Producto } from "./producto.model";
export interface CartLine {
  product: Producto;
  quantity: number;
}
export const cartTotal = (items: readonly Producto[]) =>
  items.reduce((sum, item) => sum + item.precio, 0);
