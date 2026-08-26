import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CursoService } from '../../services/curso.service';
import { RouterModule } from '@angular/router';

interface Curso {
  id: number;
  nombre: string;
  duracion: string;
  descripcion: string;
}

@Component({
  selector: 'app-buscar',
  standalone: true,
  imports: [CommonModule, RouterModule], // 👈 Importa los módulos necesarios
  templateUrl: './buscar.component.html',
  styleUrl: './buscar.component.css'
})
export class BuscarComponent implements OnInit {
  resultados: Curso[] = [];

  constructor(private route: ActivatedRoute, private cursoService: CursoService) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const termino = params['q'] || '';
      this.resultados = this.cursoService.buscarCursos(termino);
    });
  }
}
