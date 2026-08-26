import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CursoService {
  private cursos = [
  {
    id: 1,
    nombre: 'Pilates Básico',
    duracion: '3h',
    img: 'img/cursos/pilates.jpeg',
    descripcion: 'Clase básica de pilates para fortalecer el core y mejorar la postura.'
  },
  {
    id: 2,
    nombre: 'Pilates Avanzado',
    duracion: '4h',
    img: 'img/cursos/pilates-avanzado.jpeg',
    descripcion: 'Sesión intensiva de pilates con ejercicios de nivel avanzado.'
  },
  {
    id: 3,
    nombre: 'Calistenia Funcional',
    duracion: '4h',
    img: 'img/cursos/calistenia.jpeg',
    descripcion: 'Entrenamiento con el peso corporal para fuerza y resistencia.'
  },
  {
    id: 4,
    nombre: 'Yoga Relax',
    duracion: '2h',
    img: 'img/cursos/yoga-relax.jpeg',
    descripcion: 'Clase suave de yoga enfocada en respiración y estiramiento.'
  },
  {
    id: 5,
    nombre: 'Yoga Intensivo',
    duracion: '5h',
    img: 'img/cursos/yoga-intensivo.jpeg',
    descripcion: 'Sesión completa de yoga para mejorar flexibilidad y concentración.'
  },
  {
    id: 6,
    nombre: 'Cardio Box',
    duracion: '3h',
    img: 'img/cursos/cardio-box.jpeg',
    descripcion: 'Clase energética combinando movimientos de boxeo y cardio.'
  },
  {
    id: 7,
    nombre: 'Spinning',
    duracion: '1h',
    img: 'img/cursos/spinning.jpeg',
    descripcion: 'Entrenamiento de alta intensidad en bicicleta fija.'
  },
  {
    id: 8,
    nombre: 'Cross Training',
    duracion: '5h',
    img: 'img/cursos/cross-training.jpeg',
    descripcion: 'Rutina de fuerza, agilidad y cardio con diferentes estaciones.'
  },
  {
    id: 9,
    nombre: 'Stretching',
    duracion: '2h',
    img: 'img/cursos/stretching.jpeg',
    descripcion: 'Clase enfocada en estiramiento, recuperación y movilidad.'
  },
  {
    id: 10,
    nombre: 'Entrenamiento Funcional',
    duracion: '4h',
    img: 'img/cursos/funcional.jpeg',
    descripcion: 'Ejercicios que simulan movimientos reales para mejorar el rendimiento diario.'
  },
  {
    id: 11,
    nombre: 'Bootcamp',
    duracion: '3h',
    img: 'img/cursos/bootcamp.jpeg',
    descripcion: 'Entrenamiento militar intensivo en grupo al aire libre.'
  },
  {
    id: 12,
    nombre: 'Power Yoga',
    duracion: '4h',
    img: 'img/cursos/power-yoga.jpeg',
    descripcion: 'Versión más intensa de yoga con enfoque en fuerza y balance.'
  }
];

  getCursos() {
    return this.cursos;
  }

  buscarCursos(termino: string) {
    return this.cursos.filter(curso =>
      curso.nombre.toLowerCase().includes(termino.toLowerCase())
    );
  }

  getCursoPorId(id: number) {
    return this.cursos.find(c => c.id === id);
  }
}
