import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MembresiaService } from '../../services/membresia.service';
import { Membresia, PlanCatalogo } from '../../models/membresia.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-membresias',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './membresias.component.html',
  styleUrl: './membresias.component.css'
})
export class MembresiasComponent implements OnInit {
  membresiaActual!: Membresia;
  planes: PlanCatalogo[] = [];
  filtroPeriodo: 'Mensual' | 'Trimestral' | 'Anual' = 'Mensual';

  constructor(private membresiaService: MembresiaService) {}

  ngOnInit(): void {
    this.planes = this.membresiaService.getPlanes();
    this.membresiaService.membresiaActual$.subscribe((mem) => {
      this.membresiaActual = mem;
    });
  }

  cambiarPeriodo(periodo: 'Mensual' | 'Trimestral' | 'Anual'): void {
    this.filtroPeriodo = periodo;
  }

  getPrecioCalculado(precioBase: number): number {
    if (this.filtroPeriodo === 'Trimestral') {
      return Math.round(precioBase * 3 * 0.9); // 10% desc
    }
    if (this.filtroPeriodo === 'Anual') {
      return Math.round(precioBase * 12 * 0.8); // 20% desc
    }
    return precioBase;
  }

  seleccionarPlan(plan: PlanCatalogo): void {
    const precioFinal = this.getPrecioCalculado(plan.precio);

    Swal.fire({
      title: `¿Contratar Plan ${plan.nombre}?`,
      html: `
        <div style="text-align: left; font-size: 0.95rem;">
          <p><strong>Periodo:</strong> ${this.filtroPeriodo}</p>
          <p><strong>Costo:</strong> $${precioFinal} MXN</p>
          <p class="text-muted">Se activará de inmediato con todos los beneficios asociados.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ff5722',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, activar membresía',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.membresiaService.adquirirOActualizarPlan(
          { ...plan, precio: precioFinal },
          this.filtroPeriodo
        );
        Swal.fire({
          title: '¡Membresía Activada!',
          text: `Ahora disfrutas del plan ${plan.nombre}.`,
          icon: 'success',
          confirmButtonColor: '#ff5722'
        });
      }
    });
  }

  renovarActual(): void {
    Swal.fire({
      title: 'Renovar Membresía Actual',
      text: `¿Deseas extender tu suscripción del plan ${this.membresiaActual.nombrePlan} por un ciclo adicional?`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#ff5722',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Confirmar Renovación',
      cancelButtonText: 'Volver'
    }).then((result) => {
      if (result.isConfirmed) {
        this.membresiaService.renovarMembresia();
        Swal.fire({
          title: '¡Renovación Exitosa!',
          text: 'Se ha extendido la vigencia de tu plan.',
          icon: 'success',
          confirmButtonColor: '#ff5722'
        });
      }
    });
  }
}
