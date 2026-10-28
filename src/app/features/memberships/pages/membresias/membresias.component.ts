import { CommonModule } from "@angular/common";
import { Component, DestroyRef, inject } from "@angular/core";
import { RequestState } from "../../../../core/data-access/request-state";
import { RequestStateComponent } from "../../../../shared/ui/request-state/request-state.component";
import { Subscription } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import Swal from "sweetalert2";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { MEMBERSHIPS } from "../../data-access/membership.repository";
import { Membresia, PlanCatalogo } from "../../models/membresia.model";
export type BillingPeriod = "Mensual" | "Trimestral" | "Anual";
export function demoPrice(base: number, period: BillingPeriod) {
  return period === "Trimestral"
    ? Math.round(base * 3 * 0.9)
    : period === "Anual"
      ? Math.round(base * 12 * 0.8)
      : base;
}
@Component({
  selector: "app-membresias",
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IconComponent,
    ButtonDirective,
    RequestStateComponent,
  ],
  templateUrl: "./membresias.component.html",
  styleUrl: "./membresias.component.css",
})
export class MembresiasComponent {
  private service = inject(MEMBERSHIPS);
  membresiaActual: Membresia | null = null;
  private memberStream?: Subscription;
  memberLoading = false;
  memberError = "";
  private destroyRef = inject(DestroyRef);
  planes: PlanCatalogo[] = [];
  plansLoading = false;
  plansError = "";
  filtroPeriodo: BillingPeriod = "Mensual";
  processing = false;
  readonly periods: BillingPeriod[] = ["Mensual", "Trimestral", "Anual"];
  constructor() {
    this.loadMembership();
    this.destroyRef.onDestroy(() => this.memberStream?.unsubscribe());
    this.loadPlans();
  }
  get memberState(): RequestState<Membresia> {
    if (this.memberLoading) return { status: "loading" };
    if (this.memberError)
      return {
        status: "error",
        error: { kind: "network", message: this.memberError, retryable: true },
      };
    return this.membresiaActual
      ? { status: "data", data: this.membresiaActual }
      : { status: "empty" };
  }
  loadMembership() {
    this.memberStream?.unsubscribe();
    this.memberLoading = true;
    this.memberError = "";
    this.memberStream = this.service.membresiaActual$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (mem) => {
          this.membresiaActual = mem;
          this.memberLoading = false;
        },
        error: () => {
          this.memberLoading = false;
          this.memberError =
            "No se pudo consultar la membresía. Puedes volver a intentar la lectura.";
        },
      });
  }
  get plansState(): RequestState<PlanCatalogo[]> {
    if (this.plansLoading) return { status: "loading" };
    if (this.plansError)
      return {
        status: "error",
        error: { kind: "network", message: this.plansError, retryable: true },
      };
    return { status: "data", data: this.planes };
  }
  loadPlans() {
    if (this.plansLoading) return;
    this.plansLoading = true;
    this.plansError = "";
    this.service
      .loadPlans()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plans) => {
          this.planes = plans;
          this.plansLoading = false;
        },
        error: () => {
          this.plansLoading = false;
          this.plansError =
            "No se pudo consultar el catálogo de planes. Puedes reintentar la consulta.";
        },
      });
  }
  cambiarPeriodo(value: BillingPeriod) {
    this.filtroPeriodo = value;
  }
  getPrecioCalculado(base: number) {
    return demoPrice(base, this.filtroPeriodo);
  }
  hasConflict(plan: PlanCatalogo) {
    return plan.periodo !== "Mensual";
  }
  comparisonBenefits(plan: PlanCatalogo) {
    return plan.beneficios.map((benefit, i) =>
      benefit.startsWith("Todos los beneficios Pro")
        ? benefit +
          ": " +
          this.planes.find((p) => p.id === "plan-pro")?.beneficios.join("; ")
        : benefit,
    );
  }
  async seleccionarPlan(plan: PlanCatalogo) {
    if (this.processing) return;
    this.processing = true;
    const price = this.getPrecioCalculado(plan.precio);
    try {
      const result = await Swal.fire({
        title: "Revisar simulación de membresía",
        html:
          '<div class="selection-summary"><p><strong>' +
          plan.nombre +
          "</strong></p><p>Periodo seleccionado: " +
          this.filtroPeriodo +
          "</p><p>Total de demostración: <strong>$" +
          price.toLocaleString("es-MX") +
          " MXN</strong></p><p>Se guardará solo en este navegador. No hay un cobro ni una activación de acceso físico.</p>" +
          (this.hasConflict(plan)
            ? "<p><strong>Tarifa en revisión:</strong> el catálogo indica $1,200 por trimestre, pero el cálculo heredado usa esa cantidad como base mensual. Este total no es una cotización.</p>"
            : "") +
          "</div>",
        icon: this.hasConflict(plan) ? "warning" : "info",
        showCancelButton: true,
        confirmButtonText: "Guardar demostración",
        cancelButtonText: "Volver",
        ...(this.hasConflict(plan)
          ? {
              input: "checkbox" as const,
              inputValue: 0,
              inputPlaceholder: "Entiendo que la tarifa no está validada",
              inputValidator: (value: string) =>
                !value
                  ? "Confirma que comprendes la limitación de esta simulación."
                  : null,
            }
          : {}),
      });
      if (result.isConfirmed) {
        await this.service.adquirirOActualizarPlan(
          { ...plan, precio: price },
          this.filtroPeriodo,
        );
        await Swal.fire({
          icon: "success",
          title: "Demostración guardada",
          text: "La membresía de ejemplo se actualizó en este navegador. No se realizó ningún cobro.",
        });
      }
    } catch {
      await Swal.fire({
        icon: "error",
        title: "No se pudo guardar",
        text: "El almacenamiento del navegador no está disponible. Tu selección no fue activada.",
      });
    } finally {
      this.processing = false;
    }
  }
  async renovarActual() {
    if (this.processing || !this.membresiaActual) return;
    this.processing = true;
    try {
      const result = await Swal.fire({
        title: "Revisar renovación local",
        text:
          "Se añadirá un ciclo " +
          this.membresiaActual.periodo.toLowerCase() +
          " a la vigencia del ejemplo. No hay cobro ni renovación remota.",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Renovar demostración",
        cancelButtonText: "Volver",
      });
      if (result.isConfirmed) {
        await this.service.renovarMembresia();
        await Swal.fire({
          icon: "success",
          title: "Vigencia local actualizada",
          text: "La renovación se guardó únicamente en este navegador.",
        });
      }
    } catch {
      await Swal.fire({
        icon: "error",
        title: "No se pudo guardar",
        text: "Revisa el almacenamiento del navegador e inténtalo de nuevo.",
      });
    } finally {
      this.processing = false;
    }
  }
}
