import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Membresia, PlanCatalogo } from '../models/membresia.model';

@Injectable({
  providedIn: 'root'
})
export class MembresiaService {
  private storageKey = 'espacio_gym_membresia';

  private planesDisponibles: PlanCatalogo[] = [
    {
      id: 'plan-basic',
      nombre: 'Básico',
      precio: 350,
      periodo: 'Mensual',
      descripcion: 'Ideal para quienes inician su acondicionamiento físico.',
      beneficios: [
        'Acceso libre a área de pesas y cardio',
        'Acceso en horario regular (6:00 - 22:00)',
        'Uso de vestidores y lockers diarios',
        'Acceso al Coach IA con preguntas estándar'
      ]
    },
    {
      id: 'plan-pro',
      nombre: 'Pro Fitness',
      precio: 550,
      periodo: 'Mensual',
      popular: true,
      descripcion: 'El plan favorito con todas las clases incluidas y reservas QR.',
      beneficios: [
        'Acceso 100% total sin restricciones de horario',
        'Todas las clases grupales (Spinning, Yoga, Cross)',
        'Acceso ilimitado al Coach Virtual IA',
        'Generación de códigos QR de acceso rápido',
        '1 Evaluación biométrica mensual'
      ]
    },
    {
      id: 'plan-black',
      nombre: 'Black Elite',
      precio: 1200,
      periodo: 'Trimestral',
      descripcion: 'Experiencia premium completa con beneficios exclusivos.',
      beneficios: [
        'Todos los beneficios Pro Fitness',
        'Invitación a 1 acompañante gratis al mes',
        'Acceso a sillones de masaje y zona recovery',
        'Asesoría personalizada de nutrición',
        'Descuento del 15% en suplementos del Gym'
      ]
    }
  ];

  private membresiaActualSubject = new BehaviorSubject<Membresia>(this.cargarMembresiaInicial());
  public membresiaActual$: Observable<Membresia> = this.membresiaActualSubject.asObservable();

  constructor() {}

  getPlanes(): PlanCatalogo[] {
    return [...this.planesDisponibles];
  }

  getMembresiaActual(): Membresia {
    return this.calcularEstadoMembresia(this.membresiaActualSubject.value);
  }

  adquirirOActualizarPlan(plan: PlanCatalogo, periodo: 'Mensual' | 'Trimestral' | 'Anual' = 'Mensual'): void {
    const hoy = new Date();
    const mesesDuracion = periodo === 'Anual' ? 12 : periodo === 'Trimestral' ? 3 : 1;

    const fechaFin = new Date(hoy);
    fechaFin.setMonth(fechaFin.getMonth() + mesesDuracion);

    const nuevaMembresia: Membresia = {
      id: 'MEM-' + Math.floor(100000 + Math.random() * 900000),
      nombrePlan: plan.nombre,
      precio: plan.precio,
      periodo: periodo,
      fechaInicio: hoy.toISOString().split('T')[0],
      fechaFin: fechaFin.toISOString().split('T')[0],
      estado: 'Activa',
      beneficios: plan.beneficios
    };

    this.guardarEnStorage(nuevaMembresia);
  }

  renovarMembresia(): void {
    const actual = this.getMembresiaActual();
    const fechaBase = new Date(actual.fechaFin) > new Date() ? new Date(actual.fechaFin) : new Date();
    const meses = actual.periodo === 'Anual' ? 12 : actual.periodo === 'Trimestral' ? 3 : 1;
    fechaBase.setMonth(fechaBase.getMonth() + meses);

    const renovada: Membresia = {
      ...actual,
      fechaFin: fechaBase.toISOString().split('T')[0],
      estado: 'Activa'
    };

    this.guardarEnStorage(renovada);
  }

  private guardarEnStorage(membresia: Membresia): void {
    const memCalculada = this.calcularEstadoMembresia(membresia);
    localStorage.setItem(this.storageKey, JSON.stringify(memCalculada));
    this.membresiaActualSubject.next(memCalculada);
  }

  private cargarMembresiaInicial(): Membresia {
    const guardada = localStorage.getItem(this.storageKey);
    if (guardada) {
      try {
        const mem = JSON.parse(guardada) as Membresia;
        return this.calcularEstadoMembresia(mem);
      } catch (e) {
        console.error('Error cargando membresía guardada', e);
      }
    }

    // Membresía inicial por defecto para demostración
    const hoy = new Date();
    const fin = new Date(hoy);
    fin.setDate(fin.getDate() + 18); // 18 días restantes

    const defaultMem: Membresia = {
      id: 'MEM-849201',
      nombrePlan: 'Pro Fitness',
      precio: 550,
      periodo: 'Mensual',
      fechaInicio: hoy.toISOString().split('T')[0],
      fechaFin: fin.toISOString().split('T')[0],
      estado: 'Activa',
      beneficios: [
        'Acceso 100% total sin restricciones de horario',
        'Todas las clases grupales (Spinning, Yoga, Cross)',
        'Acceso ilimitado al Coach Virtual IA',
        'Generación de códigos QR de acceso rápido'
      ]
    };

    return this.calcularEstadoMembresia(defaultMem);
  }

  private calcularEstadoMembresia(mem: Membresia): Membresia {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaFin = new Date(mem.fechaFin + 'T00:00:00');
    const diffTime = fechaFin.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let estado: 'Activa' | 'Por vencer' | 'Vencida' = 'Activa';
    if (diasRestantes <= 0) {
      estado = 'Vencida';
    } else if (diasRestantes <= 5) {
      estado = 'Por vencer';
    }

    return {
      ...mem,
      estado,
      diasRestantes: Math.max(0, diasRestantes)
    };
  }
}
