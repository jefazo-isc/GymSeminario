import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js/auto';
import { BaseChartDirective } from 'ng2-charts';
import { Subscription, interval } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-graficos',
  standalone: true,
  imports: [BaseChartDirective,DatePipe,DecimalPipe],
  templateUrl: './graficos.component.html',
  styleUrls: ['./graficos.component.css']
})
export class GraficosComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Datos para las tarjetas de estadísticas
  totalSessions: number = 0;
  topActivity: string = '';
  lastUpdate: Date = new Date();

  // Configuración mejorada de la gráfica
  public barChartData: ChartData<'bar'> = {
    labels: ['Boxeo', 'Crossfit', 'Spinning', 'Yoga', 'Pesas'],
    datasets: [{
      data: [0, 0, 0, 0, 0],
      label: 'Sesiones',
      backgroundColor: [
        '#FF8C00', '#FFA500', '#FFC34D', '#FFD580', '#FFE3A9'
      ],
      borderColor: '#FFFFFF',
      borderWidth: 2,
      borderRadius: 12,
      borderSkipped: false,
      barPercentage: 0.6,
    }]
  };

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: 12,
        titleFont: { size: 16 },
        bodyFont: { size: 14 },
        callbacks: {
          label: (context) => `Sesiones: ${context.parsed.y}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 14, weight: 'bold' } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          font: { size: 12 },
          callback: (value) => (typeof value === 'number' && value % 1 === 0) ? value : ''
        }
      }
    }
  };

  public barChartType: ChartType = 'bar';

  private apiUrl = 'https://api-j6b4.onrender.com/api/sessions/stats';

  public loading = true;
  public error = false;
  private initialLoaded = false;
  private refreshSubscription?: Subscription;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.load();

    // Configurar un único intervalo con RxJS para mejor control
    this.refreshSubscription = interval(5000).subscribe(() => {
      this.load();
    });
  }

  ngOnDestroy() {
    // Limpiar la suscripción al destruir el componente
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  load() {
  // Solo mostrar spinner si es la primera carga
  if (!this.initialLoaded) {
    this.loading = true;
  }
  this.error = false;

  this.http.get<Record<string, number>>(this.apiUrl).subscribe({
    next: stats => {
      const labels = this.barChartData.labels as string[];
      this.barChartData.datasets[0].data = labels.map(t => stats[t] ?? 0);
      this.chart?.update();
      this.updateStats(stats);

      this.lastUpdate = new Date();

      if (!this.initialLoaded) {
        this.loading = false;
        this.initialLoaded = true;
      }
    },
    error: err => {
      console.error('Error cargando datos:', err);
      this.error = true;

      // Ocultar spinner en error también y marcar cargado
      if (!this.initialLoaded) {
        this.loading = false;
        this.initialLoaded = true;
      }
    }
  });
}

  private updateStats(stats: Record<string, number>) {
    // Calcular total de sesiones
    this.totalSessions = Object.values(stats).reduce((sum, val) => sum + val, 0);

    // Encontrar actividad más popular
    let topActivity = '';
    let topCount = 0;
    for (const [activity, count] of Object.entries(stats)) {
      if (count > topCount) {
        topCount = count;
        topActivity = activity;
      }
    }
    this.topActivity = topActivity;
  }
}