import {
  DOCUMENT,
  DatePipe,
  DecimalPipe,
  isPlatformBrowser,
} from "@angular/common";
import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  effect,
  inject,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ChartConfiguration, ChartData, ChartType } from "chart.js/auto";
import {
  BaseChartDirective,
  provideCharts,
  withDefaultRegisterables,
} from "ng2-charts";
import {
  Observable,
  Subscription,
  finalize,
  interval,
  map,
  timeout,
} from "rxjs";
import Swal from "sweetalert2";
import { AccessibilityService } from "../../../../core/accessibility/accessibility.service";
import {
  isAdminUser,
  isTestEnvironment,
  readGymUser,
} from "../../../../core/auth/route.guards";
import { RequestState } from "../../../../core/data-access/request-state";
import { ThemeService } from "../../../../core/theme/theme.service";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { RequestStateComponent } from "../../../../shared/ui/request-state/request-state.component";
import {
  AdminUserRecord,
  AnalyticsForecast,
  DashboardAnalytics,
  ExpiringMembership,
  HourlyOccupancyPoint,
  LiveFloorResponse,
  STATISTICS,
} from "../../data-access/statistics.repository";

@Component({
  selector: "app-graficos",
  providers: [provideCharts(withDefaultRegisterables())],
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    RequestStateComponent,
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

  totalSessions = 0;
  topActivity = "";
  lastUpdate: Date | null = null;
  hasData = false;
  autoRefresh = true;
  fetching = false;
  private readonly destroyRef = inject(DestroyRef);

  totalBookings = 0;
  totalAttendances = 0;
  activeMembers = 0;
  totalRevenue = 0;
  attendancesByActivity: Record<string, number> = {};
  hourlyOccupancy: HourlyOccupancyPoint[] = [];

  liveFloor: LiveFloorResponse | null = null;
  forecast: AnalyticsForecast | null = null;
  users: AdminUserRecord[] = [];
  expiringMemberships: ExpiringMembership[] = [];
  adminFeedback = "";
  adminBusy = false;
  readonly availableRoles = [
    "user",
    "subscriber",
    "trainer",
    "reception",
    "receptionist",
    "admin",
  ];
  readonly subscriptionPlans = [
    "Plan Básico",
    "Plan Pro",
    "Black Elite",
    "Cortesía VIP",
  ];
  readonly subscriptionPeriods: ("Mensual" | "Trimestral" | "Anual")[] = [
    "Mensual",
    "Trimestral",
    "Anual",
  ];
  userPlanSelection: Record<string, string> = {};
  userPeriodSelection: Record<string, "Mensual" | "Trimestral" | "Anual"> = {};

  public barChartData: ChartData<"bar"> = {
    labels: ["Boxeo", "Crossfit", "Spinning", "Yoga", "Pesas"],
    datasets: [
      {
        data: [0, 0, 0, 0, 0],
        label: "Reservas",
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
          label: (context) => `${context.dataset.label}: ${context.parsed.y}`,
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
  public loading = true;
  public error = false;
  private refreshSubscription?: Subscription;

  private readonly theme = inject(ThemeService);
  private readonly accessibility = inject(AccessibilityService);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  private statistics = inject(STATISTICS);
  private readonly router = inject(Router, { optional: true });

  constructor() {
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

  get viewState(): RequestState<unknown> {
    if (this.loading) return { status: "loading" };
    if (this.error)
      return {
        status: "error",
        error: {
          kind: "network",
          message:
            "La API externa no devolvió datos válidos. No mostramos cifras de ejemplo.",
          retryable: true,
        },
      };
    return { status: "data", data: this.barChartData };
  }

  ngOnInit() {
    const user = readGymUser();
    if (!isTestEnvironment() && !isAdminUser(user)) {
      void Swal.fire({
        icon: "error",
        title: "Acceso denegado al Dashboard",
        text: "Solo el administrador general (guevara.cardona.yahir@gmail.com) tiene acceso a las finanzas, dinero y métricas del gimnasio.",
        confirmButtonText: "Regresar al inicio",
        confirmButtonColor: "#375d67",
      }).then(() => {
        void this.router?.navigate(["/home"]).catch(() => undefined);
      });
      return;
    }

    this.load();
    if (!isTestEnvironment() || Boolean(user)) {
      this.loadOperationalPanels();
    }

    this.refreshSubscription = interval(5000).subscribe(() => {
      if (this.autoRefresh) this.load();
    });
  }

  ngOnDestroy() {
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

    const stats$: Observable<DashboardAnalytics | Record<string, number>> =
      this.statistics.getDashboardAnalytics
        ? this.statistics.getDashboardAnalytics()
        : this.statistics
            .getStatistics()
            .pipe(
              map(
                (stats): DashboardAnalytics | Record<string, number> => stats,
              ),
            );

    stats$
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.fetching = false;
          this.loading = false;
        }),
      )
      .subscribe({
        next: (result) => {
          if (this.isDashboardAnalytics(result)) {
            this.applyDashboardAnalytics(result);
            return;
          }
          if (!this.validFlatStats(result)) {
            this.error = true;
            return;
          }
          this.error = false;
          this.applyActivityCounts(result);
          this.totalBookings = this.totalSessions;
          this.lastUpdate = new Date();
          this.hasData = true;
        },
        error: () => {
          this.error = true;
        },
      });
  }

  loadOperationalPanels(): void {
    this.statistics
      .getLiveSessions?.()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (live) => (this.liveFloor = live),
        error: () => undefined,
      });

    this.statistics
      .getAnalyticsForecast?.()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (forecast) => (this.forecast = forecast),
        error: () => undefined,
      });

    this.statistics
      .getUsers?.()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => (this.users = users),
        error: () => undefined,
      });

    this.statistics
      .getExpiringMemberships?.()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => (this.expiringMemberships = list),
        error: () => undefined,
      });
  }

  changeUserRole(user: AdminUserRecord, newRole: string): void {
    if (this.adminBusy || !this.statistics.setUserRole) return;
    this.adminBusy = true;
    this.adminFeedback = "";
    this.statistics
      .setUserRole(user.uid, newRole)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => (this.adminBusy = false)),
      )
      .subscribe({
        next: () => {
          user.role = newRole;
          this.adminFeedback = `Rol de ${user.email} actualizado a ${newRole}.`;
        },
        error: () => {
          this.adminFeedback = `No se pudo actualizar el rol de ${user.email}.`;
        },
      });
  }

  selectedPlanFor(user: AdminUserRecord): string {
    const key = user.email.toLowerCase();
    if (this.userPlanSelection[key]) return this.userPlanSelection[key];
    const current = user.membresia?.planNombre;
    if (current && this.subscriptionPlans.includes(current)) return current;
    return "Plan Pro";
  }

  selectedPeriodFor(
    user: AdminUserRecord,
  ): "Mensual" | "Trimestral" | "Anual" {
    const key = user.email.toLowerCase();
    return this.userPeriodSelection[key] ?? "Mensual";
  }

  setUserPlan(user: AdminUserRecord, plan: string): void {
    this.userPlanSelection[user.email.toLowerCase()] = plan;
  }

  setUserPeriod(
    user: AdminUserRecord,
    period: "Mensual" | "Trimestral" | "Anual",
  ): void {
    this.userPeriodSelection[user.email.toLowerCase()] = period;
  }

  assignMembershipToUser(
    user: AdminUserRecord,
    action: "assign" | "cancel" = "assign",
  ): void {
    if (this.adminBusy || !this.statistics.assignUserMembership) return;
    const planNombre = this.selectedPlanFor(user);
    const periodo = this.selectedPeriodFor(user);
    const precio = this.resolvePlanPrice(planNombre, periodo);
    this.adminBusy = true;
    this.adminFeedback = "";
    this.statistics
      .assignUserMembership({
        userEmail: user.email,
        planNombre,
        periodo,
        action,
        precio,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => (this.adminBusy = false)),
      )
      .subscribe({
        next: (resp) => {
          if (action === "cancel") {
            user.membresia = {
              planNombre: user.membresia?.planNombre || planNombre,
              estado: "Cancelada",
              fechaFin: user.membresia?.fechaFin || "",
            };
          } else {
            user.membresia = resp.membresia ?? {
              planNombre,
              estado: "Activa",
              fechaFin: "",
            };
            if (user.role === "user") {
              user.role = "subscriber";
            }
          }
          this.adminFeedback = resp.mensaje;
          this.statistics
            .getUsers?.()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (users) => (this.users = users),
              error: () => undefined,
            });
        },
        error: () => {
          this.adminFeedback =
            action === "cancel"
              ? `No se pudo cancelar la membresía de ${user.email}.`
              : `No se pudo asignar la membresía a ${user.email}.`;
        },
      });
  }

  private resolvePlanPrice(
    planNombre: string,
    periodo: "Mensual" | "Trimestral" | "Anual",
  ): number {
    const basePrices: Record<string, number> = {
      "Plan Básico": 350,
      "Plan Pro": 550,
      "Black Elite": 1200,
      "Cortesía VIP": 0,
    };
    const base = basePrices[planNombre] ?? 550;
    if (base === 0) return 0;
    if (periodo === "Trimestral") return Math.round(base * 3 * 0.9);
    if (periodo === "Anual") return Math.round(base * 12 * 0.8);
    return base;
  }

  notifyExpiring(): void {
    if (this.adminBusy || !this.statistics.notifyExpiringMemberships) return;
    this.adminBusy = true;
    this.adminFeedback = "";
    this.statistics
      .notifyExpiringMemberships()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => (this.adminBusy = false)),
      )
      .subscribe({
        next: (resp) => {
          this.adminFeedback =
            resp.message ||
            `Notificaciones enviadas (${resp.sent} socios avisados).`;
        },
        error: () => {
          this.adminFeedback =
            "No se pudieron enviar las notificaciones de vencimiento.";
        },
      });
  }

  private isDashboardAnalytics(
    value: DashboardAnalytics | Record<string, number>,
  ): value is DashboardAnalytics {
    return (
      Boolean(value) &&
      typeof value === "object" &&
      "byActivity" in value &&
      typeof value.byActivity === "object"
    );
  }

  private validFlatStats(stats: unknown): stats is Record<string, number> {
    return Boolean(
      stats &&
        !Array.isArray(stats) &&
        typeof stats === "object" &&
        !Object.values(stats).some(
          (value) =>
            typeof value !== "number" ||
            !Number.isFinite(value) ||
            value < 0,
        ),
    );
  }

  private applyDashboardAnalytics(analytics: DashboardAnalytics): void {
    if (!this.validFlatStats(analytics.byActivity)) {
      this.error = true;
      return;
    }
    this.error = false;
    this.applyActivityCounts(analytics.byActivity);
    this.attendancesByActivity = analytics.attendancesByActivity;
    this.totalBookings = analytics.totalBookings;
    this.totalAttendances = analytics.totalAttendances;
    this.activeMembers = analytics.activeMembers;
    this.totalRevenue = analytics.totalRevenue;
    this.hourlyOccupancy = analytics.hourlyOccupancy;
    this.lastUpdate = new Date();
    this.hasData = true;
  }

  private applyActivityCounts(stats: Record<string, number>): void {
    const labels = this.barChartData.labels as string[];
    this.barChartData.datasets[0].data = labels.map((label) =>
      Object.prototype.hasOwnProperty.call(stats, label) ? stats[label] : null,
    );
    this.chart?.update();
    this.updateStats(stats);
  }

  private updateStats(stats: Record<string, number>) {
    this.totalSessions = Object.values(stats).reduce(
      (sum, val) => sum + val,
      0,
    );

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
