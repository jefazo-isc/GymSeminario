import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Integrante {
  nombre: string;
  foto: string;
}

@Component({
  imports: [CommonModule],
  selector: 'app-responsables',
  templateUrl: './responsables.component.html',
  styleUrls: ['./responsables.component.css']
})
export class ResponsablesComponent {
  readonly integrantes: Integrante[] = [
    {
      nombre: 'Jose Alberto Vazquez Guerrero',
      foto: 'img/Responsables/pepe.webp'
    },
    {
      nombre: 'Luis Antonio García Gómez',
      foto: 'img/Responsables/luis.webp'
    },
    {
      nombre: 'Yahir Guevara Cardona',
      foto: 'img/Responsables/yahir.webp'
    },
    {
      nombre: 'Martin Alfonso Romo Martínez',
      foto: 'img/Responsables/martin.webp'
    },
    {
      nombre: 'Ricardo Padilla Hernández',
      foto: 'img/Responsables/ricardo.webp'
    },
    {
      nombre: 'Jesús Eduardo Tapia Avalos',
      foto: 'img/Responsables/tapia.webp'
    }
  ];
}
