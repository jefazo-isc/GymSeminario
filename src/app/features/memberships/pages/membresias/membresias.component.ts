import { CommonModule } from "@angular/common";
import { Component, DestroyRef, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Subscription } from "rxjs";
import Swal from "sweetalert2";
import { RequestState } from "../../../../core/data-access/request-state";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { RequestStateComponent } from "../../../../shared/ui/request-state/request-state.component";
import { MEMBERSHIPS } from "../../data-access/membership.repository";
import { MembershipStripeService } from "../../data-access/membership-stripe.service";
import {
  Membresia,
  MembershipHistoryEntry,
  PlanCatalogo,
} from "../../models/membresia.model";

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
    FormsModule,
    RouterLink,
    IconComponent,
    ButtonDirective,
    RequestStateComponent,
  ],
  templateUrl: "./membresias.component.html",
  styleUrl: "./membresias.component.css",
})
export class MembresiasComponent {
  private readonly service = inject(MEMBERSHIPS);
  private readonly stripeService = inject(MembershipStripeService, {
    optional: true,
  });
  private readonly destroyRef = inject(DestroyRef);

  membresiaActual: Membresia | null = null;
  private memberStream?: Subscription;
  memberLoading = false;
  memberError = "";

  planes: PlanCatalogo[] = [];
  plansLoading = false;
  plansError = "";
  history: MembershipHistoryEntry[] = [];
  historyLoading = false;

  filtroPeriodo: BillingPeriod = "Mensual";
  processing = false;
  autoRenewSaving = false;
  autoRenewFeedback = "";
  descuentoAdmin = 0;

  adminTargetEmail = "";
  adminPlanNombre = "Plan Pro";
  adminPeriodo: BillingPeriod = "Mensual";
  adminLookupResult: Membresia | null = null;
  adminLookupHistory: MembershipHistoryEntry[] = [];
  adminBusy = false;
  adminFeedback = "";

  readonly periods: BillingPeriod[] = ["Mensual", "Trimestral", "Anual"];
  readonly adminPlanNames: string[] = [
    "Plan Básico",
    "Plan Pro",
    "Black Elite",
    "Cortesía VIP",
  ];

  get isLoggedIn(): boolean {
    return this.service.getUserSessionStatus?.().isLoggedIn ?? false;
  }

  get tieneMembresiaActiva(): Membresia | null {
    if (!this.isLoggedIn || !this.membresiaActual) return null;
    if (
      this.membresiaActual.id === "MEM-INACTIVA" ||
      this.membresiaActual.estado === "Vencida"
    ) {
      return null;
    }
    return this.membresiaActual;
  }

  get isAdmin(): boolean {
    return this.service.getUserSessionStatus?.().isAdmin ?? false;
  }

  constructor() {
    this.loadMembership();
    this.destroyRef.onDestroy(() => this.memberStream?.unsubscribe());
    this.loadPlans();
    if (this.isLoggedIn) {
      void this.loadHistory();
    }
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
    this.service.refreshMembership?.();
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

  async loadHistory() {
    if (!this.service.loadHistory) return;
    this.historyLoading = true;
    try {
      this.history = await this.service.loadHistory();
    } finally {
      this.historyLoading = false;
    }
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

  async toggleAutoRenew(enabled: boolean) {
    if (this.autoRenewSaving || !this.service.setAutoRenew || !this.membresiaActual) {
      return;
    }
    this.autoRenewSaving = true;
    this.autoRenewFeedback = "";
    try {
      const res = await this.service.setAutoRenew(enabled, this.membresiaActual.id);
      this.autoRenewFeedback = res.autoRenew
        ? "Renovación automática activada."
        : "Renovación automática desactivada.";
    } catch {
      this.autoRenewFeedback =
        "No se pudo actualizar la renovación automática en el servidor.";
    } finally {
      this.autoRenewSaving = false;
    }
  }

  async consultarClienteAdmin() {
    const email = this.adminTargetEmail.trim().toLowerCase();
    if (!email || !this.isAdmin) {
      this.adminFeedback = "Ingresa el correo electrónico del socio.";
      return;
    }
    this.adminBusy = true;
    this.adminFeedback = "";
    try {
      this.adminLookupResult =
        (await this.service.lookupClientMembership?.(email)) ?? null;
      this.adminLookupHistory =
        (await this.service.loadHistory?.(email)) ?? [];
      this.adminFeedback = this.adminLookupResult
        ? `Socio encontrado: ${this.adminLookupResult.nombrePlan} (${this.adminLookupResult.estado}).`
        : "El socio aún no tiene una membresía registrada.";
    } catch {
      this.adminFeedback = "Error al consultar la membresía del socio.";
    } finally {
      this.adminBusy = false;
    }
  }

  async ejecutarAccionAdmin(action: "assign" | "renew" | "cancel") {
    const email = this.adminTargetEmail.trim().toLowerCase();
    if (!email || !this.isAdmin || !this.service.adminAssignMembership) {
      this.adminFeedback = "Ingresa un correo válido de cliente.";
      return;
    }
    this.adminBusy = true;
    this.adminFeedback = "";
    const basePrices: Record<string, number> = {
      "Plan Básico": 350,
      "Básico": 350,
      "Plan Pro": 550,
      "Pro Fitness": 550,
      "Black Elite": 1200,
      "Cortesía VIP": 0,
    };
    const matchedPlan = this.planes.find(
      (p) => p.nombre === this.adminPlanNombre,
    );
    const basePrecio =
      basePrices[this.adminPlanNombre] ?? matchedPlan?.precio ?? 550;
    const precio =
      basePrecio === 0 ? 0 : demoPrice(basePrecio, this.adminPeriodo);
    try {
      const res = await this.service.adminAssignMembership({
        email,
        action,
        planNombre: this.adminPlanNombre as Membresia["nombrePlan"],
        precio,
        periodo: this.adminPeriodo,
      });
      this.adminFeedback =
        res.mensaje || `Acción (${action}) aplicada a ${email}.`;
      this.adminLookupResult =
        (await this.service.lookupClientMembership?.(email)) ??
        res.membresia ??
        null;
      this.adminLookupHistory =
        (await this.service.loadHistory?.(email)) ?? [];
      this.loadMembership();
      void this.loadHistory();
    } catch {
      this.adminFeedback =
        "No se pudo completar la operación administrativa en el servidor.";
    } finally {
      this.adminBusy = false;
    }
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
      void this.loadHistory();
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
            void this.loadHistory();
          }
        } else {
          await this.service.adquirirOActualizarPlan(
            { ...plan, precio: price },
            this.filtroPeriodo,
          );
          this.loadMembership();
          void this.loadHistory();
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
        void this.loadHistory();
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
            void this.loadHistory();
          }
        } else {
          await this.service.renovarMembresia();
          this.loadMembership();
          void this.loadHistory();
        }
      } else if (result.isDenied) {
        await this.service.renovarMembresia();
        await Swal.fire({
          icon: "success",
          title: "Vigencia actualizada",
          text: "La renovación de tu membresía ha sido registrada y sincronizada exitosamente.",
        });
        this.loadMembership();
        void this.loadHistory();
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
