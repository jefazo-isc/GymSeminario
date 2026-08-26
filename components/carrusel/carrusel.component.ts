import { Component } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-carrusel',
  templateUrl: './carrusel.component.html',
  styleUrls: ['./carrusel.component.css'],
  standalone: true,  // Marca el componente como standalone
  imports: [CommonModule, MatButtonModule, MatIconModule]  // Importa los módulos que necesitas
})

export class CarruselComponent {
  currentIndex: number = 0;

  images = [
    { src: 'img/CARRUSEL/1.png' },
    { src: 'img/CARRUSEL/2.png' },
    { src: 'img/CARRUSEL/3.png' },
    { src: 'img/CARRUSEL/4.png' },
    { src: 'img/CARRUSEL/5.png' },
    { src: 'img/CARRUSEL/6.png' }
  ]



  // Método para cambiar la imagen activa al hacer click en un indicador
  setActiveImage(index: number): void {
    this.currentIndex = index;
  }

  // Método para ir a la imagen anterior
  prevImage(): void {
    this.currentIndex = (this.currentIndex === 0) ? this.images.length - 1 : this.currentIndex - 1;
  }

  // Método para ir a la siguiente imagen
  nextImage(): void {
    this.currentIndex = (this.currentIndex === this.images.length - 1) ? 0 : this.currentIndex + 1;
  }
}