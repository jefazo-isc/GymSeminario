import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";

@Component({
  selector: "app-carrusel",
  templateUrl: "./carrusel.component.html",
  styleUrls: ["./carrusel.component.css"],
  standalone: true, // Marca el componente como standalone
  imports: [CommonModule], // Importa los módulos que necesitas
})
export class CarruselComponent {
  currentIndex: number = 0;

  images = [
    { src: "img/CARRUSEL/1.webp" },
    { src: "img/CARRUSEL/2.webp" },
    { src: "img/CARRUSEL/3.webp" },
    { src: "img/CARRUSEL/4.webp" },
    { src: "img/CARRUSEL/5.webp" },
    { src: "img/CARRUSEL/6.webp" },
  ];

  // Método para cambiar la imagen activa al hacer click en un indicador
  setActiveImage(index: number): void {
    if (index >= 0 && index < this.images.length) {
      this.currentIndex = index;
    }
  }

  // Método para ir a la imagen anterior
  prevImage(): void {
    if (!this.images || this.images.length === 0) return;
    this.currentIndex =
      this.currentIndex === 0 ? this.images.length - 1 : this.currentIndex - 1;
  }

  // Método para ir a la siguiente imagen
  nextImage(): void {
    if (!this.images || this.images.length === 0) return;
    this.currentIndex =
      this.currentIndex === this.images.length - 1 ? 0 : this.currentIndex + 1;
  }
}
