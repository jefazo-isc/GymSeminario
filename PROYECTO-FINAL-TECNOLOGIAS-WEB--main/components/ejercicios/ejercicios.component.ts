import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, retryWhen, scan, delay, throwError, of } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FiltroEjerciciosComponent } from '../../src/app/components/filtro-ejercicios/filtro-ejercicios.component';

@Component({
  selector: 'app-ejercicios',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatSnackBarModule,
    FiltroEjerciciosComponent,
    MatProgressSpinnerModule
  ],
  templateUrl: './ejercicios.component.html',
  styleUrls: ['./ejercicios.component.css']
})
export class EjerciciosComponent implements OnInit {
  @Output() parteSeleccionada = new EventEmitter<string>();

  datosPorParte: any[] = [];
  datosFiltrados: any[] = [];
  columnas = ['nombre', 'series', 'repeticiones', 'equipo'];
  filtroActual = '';
  cargando = true;

  private readonly API_URL = 'https://arl150.github.io/ejercicios-api/ejercicios.json';
  private readonly MAX_REINTENTOS = 3;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    console.log('Usando URL:', this.API_URL); // ← Aquí
    this.http.get<any>(this.API_URL)
      .pipe(
        retryWhen(errors =>
          errors.pipe(
            scan((acc, err: HttpErrorResponse) => {
              if (err.status === 429) {
                if (acc >= this.MAX_REINTENTOS) {
                  throw err;
                }
                return acc + 1;
              } else {
                throw err;
              }
            }, 0),
            delay(1000)
          )
        ),
        catchError((err: HttpErrorResponse) => {
          const msg = err.status === 429
            ? 'Has realizado demasiadas solicitudes. Intenta más tarde.'
            : 'Error al cargar ejercicios. Intenta más tarde.';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
          this.cargando = false;

          // Retorna la estructura esperada para evitar fallos silenciosos
          return of({ datosPorParte: [] });
        })
      )
      .subscribe(resp => {
        this.datosPorParte = resp?.datosPorParte || [];
        this.datosFiltrados = [...this.datosPorParte];
        this.cargando = false;
      });
  }

  onFiltrarEjercicios(termino: string): void {
    this.filtroActual = termino.toLowerCase().trim();
    if (!this.filtroActual) {
      this.datosFiltrados = [...this.datosPorParte];
    } else {
      this.datosFiltrados = this.datosPorParte
        .map(grupo => {
          const parteCoincide = grupo.parte.toLowerCase().includes(this.filtroActual);
          const ejerciciosFiltrados = grupo.ejercicios.filter((e: any) =>
            e.nombre.toLowerCase().includes(this.filtroActual)
          );
          if (parteCoincide) return { ...grupo };
          return ejerciciosFiltrados.length ? { ...grupo, ejercicios: ejerciciosFiltrados } : null;
        })
        .filter(g => g !== null);
    }
  }

  seleccionarParte(parte: string): void {
    this.parteSeleccionada.emit(parte);
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
