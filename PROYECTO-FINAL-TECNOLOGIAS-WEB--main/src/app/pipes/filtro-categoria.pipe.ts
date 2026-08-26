import { Pipe, PipeTransform } from '@angular/core';
import { Producto } from '../models/producto.model';

@Pipe({
  name: 'filtroCategoria'
})
export class FiltroCategoriaPipe implements PipeTransform {
  transform(productos: Producto[], categoria: string): Producto[] {
    if (!productos || !categoria) {
      return productos;
    }
    return productos.filter(producto => producto.categoria === categoria);
  }
}