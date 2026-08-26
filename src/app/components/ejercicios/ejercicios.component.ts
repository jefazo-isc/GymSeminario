import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { HttpClientModule, HttpClient } from '@angular/common/http'; 
import { FiltroEjerciciosComponent } from '../filtro-ejercicios/filtro-ejercicios.component';

@Component({
  selector: 'app-ejercicios',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    HttpClientModule, 
    FiltroEjerciciosComponent
  ],
  templateUrl: './ejercicios.component.html',
  styleUrls: ['./ejercicios.component.css']
})
export class EjerciciosComponent implements OnInit {
  @Output() parteSeleccionada = new EventEmitter<string>();

  datosPorParte: any[] = [];
  datosFiltrados: any[] = [];
  columnas: string[] = ['nombre', 'series', 'repeticiones', 'equipo'];
  filtroActual: string = '';

  constructor(private http: HttpClient) {} 

  ngOnInit(): void {
    this.http.get<any>('https://arl150.github.io/ejercicios-api/ejercicios.json')
.subscribe(
      response => {
        this.datosPorParte = response.datosPorParte || [];
        this.datosFiltrados = [...this.datosPorParte];
      },
      error => {
        console.error('Error al cargar ejercicios desde la API', error);
      }
    );
  }

  seleccionarParte(parte: string): void {
    this.parteSeleccionada.emit(parte);
  }

  onFiltrarEjercicios(termino: string): void {
    this.filtroActual = termino.toLowerCase().trim();

    if (this.filtroActual === '') {
      this.datosFiltrados = [...this.datosPorParte];
    } else {
      this.datosFiltrados = this.datosPorParte.map(grupo => {
        const parteCoincide = grupo.parte.toLowerCase().includes(this.filtroActual);
        const ejerciciosFiltrados = grupo.ejercicios.filter((ejercicio: any) =>
          ejercicio.nombre.toLowerCase().includes(this.filtroActual)
        );

        if (parteCoincide) {
          return { ...grupo, ejercicios: grupo.ejercicios };
        }

        if (ejerciciosFiltrados.length > 0) {
          return { ...grupo, ejercicios: ejerciciosFiltrados };
        }

        return null;
      }).filter(grupo => grupo !== null);
    }
  }

  resaltarTexto(texto: string, termino: string): string {
    if (!termino || termino.trim() === '') return texto;
    const regex = new RegExp(`(${termino})`, 'gi');
    return texto.replace(regex, '<mark style="background-color: #ff7f00; color: white; padding: 2px 4px; border-radius: 3px;">$1</mark>');
  }

  resaltarParte(parte: string, termino: string): string {
    if (!termino || termino.trim() === '') return parte;
    const regex = new RegExp(`(${termino})`, 'gi');
    return parte.replace(regex, '<mark style="background-color: #ff7f00; color: white; padding: 2px 4px; border-radius: 3px;">$1</mark>');
  }
}
