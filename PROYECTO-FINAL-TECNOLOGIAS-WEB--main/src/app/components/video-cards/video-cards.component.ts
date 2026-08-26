import { Component, Input, OnChanges } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';
import { signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-video-cards',
  standalone: true,
  imports: [CommonModule, MatCardModule, SafeUrlPipe],
  templateUrl: './video-cards.component.html',
  styleUrls: ['./video-cards.component.scss']
})
export class VideoCardsComponent {
    @Input() parte: string = '';

  // Señal para videos (constante)
  videoIds = [
    'UglCbW0bmEw?si=kS0sVhqsQmqmHi9L',
    'KXnOryN4ENc?si=N8Xihz3SpbOdYmwK',
    'i1PzWkmY7gQ?si=0bvnYhzR_3puqxhz',
    'wzIsWDRQmVs?si=EsIV-f4Yjb-oyb3S',
    'YB6PwKTnKnw?si=ljeSm1ddRxD0EZwM',
    'nHtypUjIB-A?si=nc4io85oFCS3RiPG'
  ];

  partesDelCuerpo = ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'abdomen'];

  // Señales
  mostrarTodos = signal(true);
  visibilidadVideos = signal<boolean[]>(this.videoIds.map(() => true));

  // Computada (opcional) para acceder fácilmente
  videosVisibles = computed(() => this.visibilidadVideos());

  toggleTodosVideos(): void {
    const nuevoEstado = !this.mostrarTodos();
    this.mostrarTodos.set(nuevoEstado);
    this.visibilidadVideos.set(this.videoIds.map(() => nuevoEstado));
  }

  mostrarUnSoloVideo(parte: string): void {
    const indice = this.partesDelCuerpo.findIndex(p => p.toLowerCase() === parte.toLowerCase());
    this.visibilidadVideos.set(this.videoIds.map((_, i) => i === indice));
    this.mostrarTodos.set(false);
  }
}