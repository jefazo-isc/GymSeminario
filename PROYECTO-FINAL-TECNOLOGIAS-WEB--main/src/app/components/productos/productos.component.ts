import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Producto } from '../../models/producto.model';
import { CommonModule } from '@angular/common';
import { FiltroCategoriaPipe } from '../../pipes/filtro-categoria.pipe';
import { filter } from 'rxjs/operators';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import Swal from 'sweetalert2';

declare var paypal: any;

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements AfterViewInit {

  constructor(private router: Router, private route: ActivatedRoute) { }

  productos: Producto[] = [
    // 8 Proteínas (Gymshark, YoungLA, Optimum Nutrition, Myprotein)
    { id: 1, nombre: 'Gymshark Whey Protein', descripcion: 'Proteína de suero premium Gymshark', precio: 1, imagen: 'https://m.media-amazon.com/images/I/51+1dK5TL6L._AC_SX679_.jpg', categoria: 'proteina' },
    { id: 2, nombre: 'YoungLA Protein Blend', descripcion: 'Mezcla de proteínas YoungLA sabor chocolate', precio: 1400, imagen: 'https://suplementosmty.com/cdn/shop/files/IMG-4793.jpg?v=1702078683', categoria: 'proteina' },
    { id: 3, nombre: 'Optimum Nutrition Gold Standard 100% Whey', descripcion: 'Proteína clásica con gran reputación', precio: 1600, imagen: 'https://m.media-amazon.com/images/I/71wWgr-umZL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'proteina' },
    { id: 4, nombre: 'Myprotein Impact Whey Protein', descripcion: 'Alta calidad y sabor', precio: 1300, imagen: 'https://m.media-amazon.com/images/I/71QtLjCJEoL.__AC_SY300_SX300_QL70_ML2_.jpg', categoria: 'proteina' },
    { id: 5, nombre: 'Gymshark Vegan Protein', descripcion: 'Proteína vegetal premium Gymshark', precio: 1550, imagen: 'https://m.media-amazon.com/images/I/81JTsLHeabL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'proteina' },
    { id: 6, nombre: 'Dymatize ISO100 Hydrolyzed', descripcion: 'Proteína hidrolizada ultra pura', precio: 1800, imagen: 'https://m.media-amazon.com/images/I/71jfRGW8UKL._AC_SX679_.jpg', categoria: 'proteina' },
    { id: 7, nombre: 'YoungLA Classic Protein', descripcion: 'Proteína sabor vainilla', precio: 1400, imagen: 'https://m.media-amazon.com/images/I/71BbxhrEYTL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'proteina' },
    { id: 8, nombre: 'BSN Syntha-6 Protein', descripcion: 'Mezcla de proteínas con sabor', precio: 1500, imagen: 'https://m.media-amazon.com/images/I/81LCzECwIzL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'proteina' },

    // 8 Creatinas (Optimum, MuscleTech, Myprotein, Cellucor)
    { id: 9, nombre: 'Optimum Nutrition Micronized Creatine', descripcion: 'Creatina monohidrato micronizada', precio: 550, imagen: 'https://m.media-amazon.com/images/I/61maAQ6fA1L._AC_SX679_.jpg', categoria: 'creatina' },
    { id: 10, nombre: 'MuscleTech Platinum Creatine', descripcion: 'Creatina pura para potencia', precio: 600, imagen: 'https://m.media-amazon.com/images/I/71O3oYyFxBL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'creatina' },
    { id: 11, nombre: 'Myprotein Creatina Monohidrato', descripcion: 'Creatina de alta calidad', precio: 520, imagen: 'https://m.media-amazon.com/images/I/71B7W90YtTL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'creatina' },
    { id: 12, nombre: 'Cellucor Cor-Performance Creatine', descripcion: 'Apoya fuerza y recuperación', precio: 580, imagen: 'https://m.media-amazon.com/images/I/61fS4Lp+CdL._AC_SY300_SX300_.jpg', categoria: 'creatina' },
    { id: 13, nombre: 'Creatina Creapure', descripcion: 'Alta pureza alemana', precio: 650, imagen: 'https://m.media-amazon.com/images/I/61D1tjM+bVL._AC_SY300_SX300_.jpg', categoria: 'creatina' },
    { id: 14, nombre: 'Universal Nutrition Creatine', descripcion: 'Fuerza y resistencia', precio: 560, imagen: 'https://m.media-amazon.com/images/I/414iFZbgx2L.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'creatina' },
    { id: 15, nombre: 'Kaged Muscle Creatine HCl', descripcion: 'Creatina HCl de alta absorción', precio: 700, imagen: 'https://m.media-amazon.com/images/I/61mBp28SgvL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'creatina' },
    { id: 16, nombre: 'Optimum Nutrition Creatine Capsules', descripcion: 'Creatina en cápsulas', precio: 750, imagen: 'https://m.media-amazon.com/images/I/41XGzzp1xnL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'creatina' },

    // 8 Pre-entrenos (C4, Legion Pulse, Optimum, Ghost)
    { id: 17, nombre: 'Cellucor C4 Original', descripcion: 'Pre-entreno popular y efectivo', precio: 800, imagen: 'https://m.media-amazon.com/images/I/71toMEyF4jL._AC_SX679_.jpg', categoria: 'preentreno' },
    { id: 18, nombre: 'Legion Pulse', descripcion: 'Pre-entreno con ingredientes naturales', precio: 950, imagen: 'https://m.media-amazon.com/images/I/71IdSCqb1xL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'preentreno' },
    { id: 19, nombre: 'Optimum Nutrition Gold Pre-Workout', descripcion: 'Foco y energía', precio: 900, imagen: 'https://m.media-amazon.com/images/I/71C6xWuT2oL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'preentreno' },
    { id: 20, nombre: 'Ghost Legend', descripcion: 'Pre-entreno con sabor', precio: 1000, imagen: 'https://m.media-amazon.com/images/I/71nJKcwyysL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'preentreno' },
    { id: 21, nombre: 'BSN N.O.-Xplode', descripcion: 'Explosivo y duradero', precio: 850, imagen: 'https://m.media-amazon.com/images/I/51SCA8HklRL._AC_SX679_.jpg', categoria: 'preentreno' },
    { id: 22, nombre: 'Kaged Muscle Pre-Kaged', descripcion: 'Foco y resistencia', precio: 920, imagen: 'https://m.media-amazon.com/images/I/81dE-FJT66L.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'preentreno' },
    { id: 23, nombre: 'MuscleTech VaporX5', descripcion: 'Pre-entreno clásico', precio: 870, imagen: 'https://m.media-amazon.com/images/I/71nrqrrxwwL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'preentreno' },
    { id: 24, nombre: 'Redcon1 Total War', descripcion: 'Pre-entreno potente', precio: 980, imagen: 'https://m.media-amazon.com/images/I/71TvvW8L7VL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'preentreno' },

    // 6 Accesorios (straps, guantes, cinturones)
    { id: 25, nombre: 'Gymshark Straps', descripcion: 'Straps para levantamiento', precio: 300, imagen: 'https://m.media-amazon.com/images/I/71uR-wVYS4L.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'accesorio' },
    { id: 26, nombre: 'YoungLA Guantes de Entrenamiento', descripcion: 'Guantes para pesas', precio: 350, imagen: 'https://site-product.innovasport.com/img-test/1369826-001/1369826-001_1-1200_x_1200.jpg', categoria: 'accesorio' },
    { id: 27, nombre: 'Cinturón de levantamiento', descripcion: 'Soporte lumbar', precio: 400, imagen: 'https://m.media-amazon.com/images/I/81XOlJpgjiL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'accesorio' },
    { id: 28, nombre: 'Rodilleras deportivas', descripcion: 'Protección para rodillas', precio: 280, imagen: 'https://m.media-amazon.com/images/I/511C5UmC4-L.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'accesorio' },
    { id: 29, nombre: 'Cuerda para saltar', descripcion: 'Ideal para cardio', precio: 150, imagen: 'https://m.media-amazon.com/images/I/41VPkyVIDrL.__AC_SY300_SX300_QL70_ML2_.jpg', categoria: 'accesorio' },
    { id: 30, nombre: 'Toalla deportiva Gymshark', descripcion: 'Absorbe sudor', precio: 200, imagen: 'https://m.media-amazon.com/images/I/71iyTznE3KL.__AC_SY300_SX300_QL70_ML2_.jpg', categoria: 'accesorio' },

    // 10 Ropa (Gymshark, YoungLA, Nike, Adidas)
    { id: 31, nombre: 'Camiseta Gymshark Training', descripcion: 'Camiseta técnica', precio: 900, imagen: 'https://cdn.shopify.com/s/files/1/0156/6146/files/GFXRestDay3RDEBoxyT-ShirtGSBlackA2B8H-BB2J-0968-0090_4a9deb70-4b68-4bca-a923-205089f6e612_3840x.jpg?v=1742894740', categoria: 'ropa' },
    { id: 32, nombre: 'Shorts YoungLA', descripcion: 'Shorts deportivos cómodos', precio: 850, imagen: 'https://ae-pic-a1.aliexpress-media.com/kf/Sfe8e2866a7974020abdcc25391d4072am.jpg_960x960q75.jpg_.avif', categoria: 'ropa' },
    { id: 33, nombre: 'Sudadera Nike Dri-FIT', descripcion: 'Sudadera ligera', precio: 1200, imagen: 'https://m.media-amazon.com/images/I/51+LeklyN5L._AC_SY300_SX300_.jpg', categoria: 'ropa' },
    { id: 34, nombre: 'Pantalón Adidas Training', descripcion: 'Pantalón para entrenamiento', precio: 1100, imagen: 'https://m.media-amazon.com/images/I/61Lo3u356gL._AC_SX679_.jpg', categoria: 'ropa' },
    { id: 35, nombre: 'Tank Top Gymshark', descripcion: 'Sin mangas para entrenar', precio: 750, imagen: 'https://cdn.shopify.com/s/files/1/1367/5207/files/PowerOriginalsCutOffTankGSBlackA2C9M-BB2J_1004_d757e053-32cf-4273-977b-476e66407bde_3840x.jpg?v=1741104503', categoria: 'ropa' },
    { id: 36, nombre: 'Joggers YoungLA', descripcion: 'Joggers cómodos y estilizados', precio: 1000, imagen: 'https://http2.mlstatic.com/D_NQ_NP_606361-MLM84544006589_052025-O-youngla-pants-revenge-joggers-original-.webp', categoria: 'ropa' },
    { id: 37, nombre: 'Sudadera con capucha Nike', descripcion: 'Para días fríos', precio: 1300, imagen: 'https://m.media-amazon.com/images/I/51cB8iGPJZL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'ropa' },
    { id: 38, nombre: 'Camiseta Adidas Climalite', descripcion: 'Tecnología para mantenerte fresco', precio: 900, imagen: 'https://m.media-amazon.com/images/I/71RbhHjzPQL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'ropa' },
    { id: 39, nombre: 'Pantalones cortos Under Armour', descripcion: 'Comodidad y rendimiento', precio: 850, imagen: 'https://m.media-amazon.com/images/I/618TPqKNYyL._AC_SX679_.jpg', categoria: 'ropa' },
    { id: 40, nombre: 'Chaqueta deportiva YoungLA', descripcion: 'Estilo y confort', precio: 1400, imagen: 'https://http2.mlstatic.com/D_NQ_NP_622245-MLM81897706022_012025-O-youngla-anarchy-hoodie-sudadera-original-.webp', categoria: 'ropa' },
  ];


  carrito: Producto[] = [];
  total: number = 0;

scrollTo(seccionId: string) {
  const elemento = document.getElementById(seccionId);
  if (elemento) {
    elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}



  ngAfterViewInit() {
    // Scroll si hay fragmento en la URL
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const fragment = this.route.snapshot.fragment;
      if (fragment) {
        const element = document.getElementById(fragment);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
      this.renderPayPalButton(); // ✅ Se asegura de renderizar si se cambia de ruta
    });

    this.renderPayPalButton(); // ✅ Render inicial
  }

  agregarAlCarrito(producto: Producto) {
    this.carrito.push(producto);
    this.calcularTotal();
    this.renderPayPalButton(); // ✅ Re-render después de cambios
  }

  eliminarDelCarrito(index: number) {
    this.carrito.splice(index, 1);
    this.calcularTotal();
    this.renderPayPalButton(); // ✅ Re-render después de cambios
  }

  calcularTotal() {
    this.total = this.carrito.reduce((sum, item) => sum + item.precio, 0);
  }

  renderPayPalButton() {
    const container = document.getElementById('paypal-button-container');
    if (this.carrito.length === 0 || !container) return;

    container.innerHTML = ''; // Limpia antes de volver a renderizar

    paypal.Buttons({
      createOrder: (data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: this.total.toFixed(2)
            }
          }]
        });
      },
      onApprove: (data: any, actions: any) => {
        return actions.order.capture().then((details: any) => {
          Swal.fire({
            title: '¡Pago exitoso!',
            text: `Gracias ${details.payer.name.given_name} por tu compra.`,
            icon: 'success',
            confirmButtonColor: '#ff6f00',
            confirmButtonText: 'Continuar'
          });
          this.carrito = [];
          this.total = 0;
          this.renderPayPalButton();
        });
      }
      ,
      onError: (err: any) => {
        console.error('Error en el pago:', err);
        Swal.fire({
          title: '¡Error en el pago!',
          text: 'Ocurrió un problema al procesar el pago. Por favor intenta nuevamente.',
          icon: 'error',
          confirmButtonColor: '#d33',
          confirmButtonText: 'Aceptar'
        });
      }

    }).render('#paypal-button-container');
  }

  // Getters por categoría
  get proteinas() {
    return this.productos.filter(p => p.categoria === 'proteina');
  }

  get creatinas() {
    return this.productos.filter(p => p.categoria === 'creatina');
  }

  get preentrenos() {
    return this.productos.filter(p => p.categoria === 'preentreno');
  }

  get accesorios() {
    return this.productos.filter(p => p.categoria === 'accesorio');
  }

  get ropa() {
    return this.productos.filter(p => p.categoria === 'ropa');
  }
  
}
