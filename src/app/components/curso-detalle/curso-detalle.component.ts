import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CursoService } from '../../services/curso.service';
import { Router, RouterModule } from '@angular/router';

interface Curso {
  id: number;
  nombre: string;
  duracion: string;
  img: string;
  descripcion:string;
}

@Component({
  selector: 'app-curso-detalle',
  standalone: true,
  imports: [CommonModule,RouterModule],
  templateUrl: './curso-detalle.component.html',
  styleUrl: './curso-detalle.component.css'
})
export class CursoDetalleComponent implements OnInit {
  curso: Curso | undefined;

  constructor(
    private route: ActivatedRoute,
    private cursoService: CursoService
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? +idParam : null;

    if (id !== null) {
      this.curso = this.cursoService.getCursoPorId(id);
    } else {
      console.error('ID no encontrado en la ruta');
    }
  }
}
