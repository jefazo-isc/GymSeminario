import { ButtonDirective } from "../../shared/ui/button.directive";
import { IconComponent } from "../../shared/ui/icon/icon.component";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { finalize, timeout } from "rxjs";
import { HttpClient } from "@angular/common/http";
import {
  Component,
  OnInit,
  ViewChild,
  OnDestroy,
  effect,
  inject,
  PLATFORM_ID,
  DestroyRef,
} from "@angular/core";
import { ChartConfiguration, ChartData, ChartType } from "chart.js/auto";
import { BaseChartDirective } from "ng2-charts";
import { Subscription, interval } from "rxjs";
import {
  DOCUMENT,
  DatePipe,
  DecimalPipe,
  isPlatformBrowser,
} from "@angular/common";
import { ThemeService } from "../../core/theme/theme.service";
import { AccessibilityService } from "../../core/accessibility/accessibility.service";

@Component({
  selector: "app-graficos",
  standalone: true,
  imports: [
    BaseChartDirective,
    DatePipe,
    DecimalPipe,
    ButtonDirective,
    IconComponent,
  ],
  templateUrl: "./graficos.component.html",
  styleUrls: ["./graficos.component.css"],
})
export class GraficosComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Datos para las tarjetas de estadísticas
  totalSessions: number = 0;
  topActivity: string = "";
  lastUpdate: Date | null = null;
  hasData = false;
  autoRefresh = true;
  fetching = false;
  private readonly destroyRef = inject(DestroyRef);

  // Configuración mejorada de la gráfica
  public barChartData: ChartData<"bar"> = {
    labels: ["Boxeo", "Crossfit", "Spinning", "Yoga", "Pesas"],
    datasets: [
      {
        data: [0, 0, 0, 0, 0],
        label: "Sesiones",
        backgroundColor: [],
        borderColor: "transparent",
        borderWidth: 2,
        borderRadius: 12,
        borderSkipped: false,
        barPercentage: 0.6,
      },
    ],
  };

  public barChartOptions: ChartConfiguration["options"] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        padding: 12,
        titleFont: { size: 16 },
        bodyFont: { size: 14 },
        callbacks: {
          label: (context) => `Sesiones: ${context.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 14, weight: "bold" } },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        ticks: {
          font: { size: 12 },
          callback: (value) =>
            typeof value === "number" && value % 1 === 0 ? value : "",
        },
      },
    },
  };

  public barChartType: ChartType = "bar";

  private apiUrl = "https://api-j6b4.onrender.com/api/sessions/stats";

  public loading = true;
  public error = false;
  private initialLoaded = false;
  private refreshSubscription?: Subscription;

  private readonly theme = inject(ThemeService);
  private readonly accessibility = inject(AccessibilityService);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(private http: HttpClient) {
    effect(() => {
      this.theme.effective();
      this.accessibility.moreContrast();
      const reducedMotion = this.accessibility.reducedMotion();
      if (!this.browser) return;
      const view = this.document.defaultView;
      if (!view) return;
      const styles = view.getComputedStyle(this.document.documentElement);
      const color = (name: string) =>
        styles.getPropertyValue(`--color-${name}`).trim();
      this.barChartData.datasets[0].backgroundColor = [1, 2, 3, 4, 5].map((i) =>
        color(`chart-${i}`),
      );
      this.barChartOptions = {
        ...this.barChartOptions,
        color: color("text"),
        animation: {
          duration:
            reducedMotion ||
            view.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? 0
              : 220,
        },
        plugins: {
          ...this.barChartOptions?.plugins,
          tooltip: {
            ...this.barChartOptions?.plugins?.tooltip,
            backgroundColor: color("surface-raised"),
            titleColor: color("text"),
            bodyColor: color("text"),
            borderColor: color("border-strong"),
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            ...this.barChartOptions?.scales?.["x"],
            ticks: { color: color("text-secondary") },
            grid: { display: false },
          },
          y: {
            ...this.barChartOptions?.scales?.["y"],
            ticks: {
              ...this.barChartOptions?.scales?.["y"]?.ticks,
              color: color("text-secondary"),
            },
            grid: { color: color("border") },
          },
        },
      };
      this.chart?.update("none");
    });
  }

  ngOnInit() {
    this.load();

    // Configurar un único intervalo con RxJS para mejor control
    this.refreshSubscription = interval(5000).subscribe(() => {
      if (this.autoRefresh) this.load();
    });
  }

  ngOnDestroy() {
    // Limpiar la suscripción al destruir el componente
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  toggleRefresh() {
    this.autoRefresh = !this.autoRefresh;
  }
  load() {
    if (this.fetching) return;
    this.fetching = true;
    if (!this.hasData) this.loading = true;
    this.http
      .get<Record<string, number>>(this.apiUrl)
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.fetching = false;
          this.loading = false;
        }),
      )
      .subscribe({
        next: (stats) => {
          if (
            !stats ||
            Array.isArray(stats) ||
            typeof stats !== "object" ||
            Object.values(stats).some(
              (value) =>
                typeof value !== "number" ||
                !Number.isFinite(value) ||
                value < 0,
            )
          ) {
            this.error = true;
            return;
          }
          this.error = false;
          const labels = this.barChartData.labels as string[];
          this.barChartData.datasets[0].data = labels.map(
            (label) => Object.prototype.hasOwnProperty.call(stats,label) ? stats[label] : null,
          );
          this.chart?.update();
          this.updateStats(stats);
          this.lastUpdate = new Date();
          this.hasData = true;
          this.initialLoaded = true;
        },
        error: () => {
          this.error = true;
        },
      });
  }

  private updateStats(stats: Record<string, number>) {
    // Calcular total de sesiones
    this.totalSessions = Object.values(stats).reduce(
      (sum, val) => sum + val,
      0,
    );

    // Encontrar actividad más popular
    let topActivity = "";
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
