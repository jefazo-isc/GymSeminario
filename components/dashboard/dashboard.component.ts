import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { EjerciciosComponent } from '../ejercicios/ejercicios.component';
import { VideoCardsComponent } from '../../src/app/components/video-cards/video-cards.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, EjerciciosComponent, VideoCardsComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  parteSeleccionada: string = '';

  actualizarParte(parte: string): void {
    this.parteSeleccionada = parte;
  }
}
