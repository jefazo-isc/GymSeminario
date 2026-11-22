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
import { MembershipStripeService } from "../../data-access/membership-stripe.service";
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
  private stripeService = inject(MembershipStripeService, { optional: true });
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
  descuentoAdmin = 0;
  readonly periods: BillingPeriod[] = ["Mensual", "Trimestral", "Anual"];

  get isLoggedIn(): boolean {
    try {
      const raw = localStorage.getItem("gym_user");
      return !!raw;
    } catch {
      return false;
    }
  }

  get tieneMembresiaActiva(): Membresia | null {
    if (!this.isLoggedIn || !this.membresiaActual) return null;
    if (this.membresiaActual.id === "MEM-INACTIVA" || this.membresiaActual.estado === "Vencida") {
      return null;
    }
    return this.membresiaActual;
  }

  get isAdmin(): boolean {
    try {
      const raw = localStorage.getItem("gym_user");
      if (!raw) return false;
      const u = JSON.parse(raw);
      const email = (u?.email || "").toLowerCase().trim();
      const role = (u?.role || "").toLowerCase().trim();
      return (
        email === "guevara.cardona.yahir@gmail.com" ||
        email === "admin@gymseminario.com" ||
        role === "admin"
      );
    } catch {
      return false;
    }
  }
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
    let price = demoPrice(base, this.filtroPeriodo);
    if (this.descuentoAdmin > 0) {
      price = Math.round(price * (1 - this.descuentoAdmin / 100));
    }
    return price;
  }

  async aplicarDescuentoAdmin() {
    if (!this.isAdmin) {
      void Swal.fire(
        "Acceso denegado",
        "Solo el administrador general (guevara.cardona.yahir@gmail.com) puede otorgar descuentos especiales.",
        "error",
      );
      return;
    }
    const { value: descuento } = await Swal.fire({
      title: "Otorgar Descuento Especial (Admin)",
      text: "Selecciona el descuento aplicable a los planes:",
      input: "select",
      inputOptions: {
        "10": "10% Descuento Especial",
        "20": "20% Descuento Convenio UAA",
        "30": "30% Descuento Lealtad",
        "50": "50% Beca Deportiva",
      },
      inputPlaceholder: "Selecciona el porcentaje",
      showCancelButton: true,
      confirmButtonText: "Aplicar descuento",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#f59e0b",
    });
    if (descuento) {
      this.descuentoAdmin = Number(descuento);
      void Swal.fire({
        icon: "success",
        title: "Descuento aplicado",
        text: `Se aplicará ${descuento}% de descuento en todos los planes.`,
        timer: 1800,
        showConfirmButton: false,
      });
    }
  }

  async cancelarMembresia() {
    if (!this.isAdmin) {
      void Swal.fire(
        "Acceso denegado",
        "Solo el administrador general (guevara.cardona.yahir@gmail.com) puede cancelar suscripciones de usuarios.",
        "error",
      );
      return;
    }
    const result = await Swal.fire({
      title: "¿Cancelar membresía?",
      text: "Esta acción cambiará el estado de la membresía a Vencida y el usuario perderá acceso a funciones exclusivas.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, cancelar membresía",
      cancelButtonText: "Volver",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
    });
    if (result.isConfirmed) {
      if (typeof this.service.cancelarMembresia === "function") {
        await this.service.cancelarMembresia();
      }
      void Swal.fire({
        icon: "success",
        title: "Membresía cancelada",
        text: "La membresía ha quedado registrada como Vencida.",
        timer: 1800,
        showConfirmButton: false,
      });
      this.loadMembership();
    }
  }
  hasConflict(plan: PlanCatalogo) {
    return plan.periodo !== "Mensual";
  }
  comparisonBenefits(plan: PlanCatalogo) {
    return plan.beneficios.map((benefit) =>
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
        title: "Confirmar plan de membresía",
        html:
          '<div class="selection-summary"><p><strong>' +
          plan.nombre +
          "</strong></p><p>Periodo seleccionado: " +
          this.filtroPeriodo +
          "</p><p>Total a pagar: <strong>$" +
          price.toLocaleString("es-MX") +
          " MXN</strong></p><p>Selecciona tu modalidad de pago preferida:</p>" +
          (this.hasConflict(plan)
            ? "<p><strong>Tarifa en revisión:</strong> el catálogo indica $1,200 por trimestre, pero el cálculo heredado usa esa cantidad como base mensual. Este total no es una cotización.</p>"
            : "") +
          "</div>",
        icon: this.hasConflict(plan) ? "warning" : "info",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "💳 Pagar con Tarjeta o Cupón (Stripe)",
        denyButtonText: "💵 Registro en Recepción",
        cancelButtonText: "Volver",
        confirmButtonColor: "#4f46e5",
        denyButtonColor: "#475569",
        cancelButtonColor: "#94a3b8",
        ...(this.hasConflict(plan)
          ? {
              input: "checkbox" as const,
              inputValue: 0,
              inputPlaceholder: "Entiendo que la tarifa no está validada",
              inputValidator: (value: string) =>
                !value
                  ? "Confirma que comprendes la condición de este plan."
                  : null,
            }
          : {}),
      });

      if (result.isConfirmed) {
        if (this.stripeService) {
          const res = await this.stripeService.iniciarFlujoPagoStripe(
            plan,
            this.filtroPeriodo,
            price,
          );
          if (res.success) {
            this.loadMembership();
          }
        } else {
          await this.service.adquirirOActualizarPlan(
            { ...plan, precio: price },
            this.filtroPeriodo,
          );
          this.loadMembership();
        }
      } else if (result.isDenied) {
        await this.service.adquirirOActualizarPlan(
          { ...plan, precio: price },
          this.filtroPeriodo,
        );
        await Swal.fire({
          icon: "success",
          title: "Membresía activada",
          text: "Tu plan se ha actualizado exitosamente y sincronizado en tu cuenta.",
        });
        this.loadMembership();
      }
    } catch {
      await Swal.fire({
        icon: "error",
        title: "No se pudo guardar",
        text: "Hubo un problema al procesar tu solicitud. Intenta de nuevo.",
      });
    } finally {
      this.processing = false;
    }
  }
  async renovarActual() {
    if (this.processing || !this.membresiaActual) return;
    this.processing = true;
    const mem = this.membresiaActual;
    const planCorrespondiente: PlanCatalogo = this.planes.find(
      (p) => p.nombre === mem.nombrePlan,
    ) || {
      id: "plan-renovacion",
      nombre: mem.nombrePlan,
      precio: mem.precio,
      periodo: mem.periodo,
      descripcion: "Renovación de membresía",
      beneficios: mem.beneficios,
    };
    const price = this.getPrecioCalculado(mem.precio);

    try {
      const result = await Swal.fire({
        title: "Renovar membresía",
        html: `
          <p>Se añadirá un ciclo <strong>${mem.periodo.toLowerCase()}</strong> a tu membresía.</p>
          <p>Total a cubrir: <strong>$${price.toLocaleString("es-MX")} MXN</strong></p>
          <p>Selecciona tu método de renovación:</p>
        `,
        icon: "info",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "💳 Renovar con Stripe o Cupón",
        denyButtonText: "💵 Renovar en Recepción",
        cancelButtonText: "Volver",
        confirmButtonColor: "#4f46e5",
        denyButtonColor: "#475569",
        cancelButtonColor: "#94a3b8",
      });

      if (result.isConfirmed) {
        if (this.stripeService) {
          const res = await this.stripeService.iniciarFlujoPagoStripe(
            planCorrespondiente,
            mem.periodo as BillingPeriod,
            price,
          );
          if (res.success) {
            this.loadMembership();
          }
        } else {
          await this.service.renovarMembresia();
          this.loadMembership();
        }
      } else if (result.isDenied) {
        await this.service.renovarMembresia();
        await Swal.fire({
          icon: "success",
          title: "Vigencia actualizada",
          text: "La renovación de tu membresía ha sido registrada y sincronizada exitosamente.",
        });
        this.loadMembership();
      }
    } catch {
      await Swal.fire({
        icon: "error",
        title: "No se pudo guardar",
        text: "Hubo un problema al renovar tu membresía. Intenta de nuevo.",
      });
    } finally {
      this.processing = false;
    }
  }
}
