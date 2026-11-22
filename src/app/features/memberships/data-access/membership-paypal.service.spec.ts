import { TestBed } from "@angular/core/testing";
import {
  MembershipPaypalService,
  calcularComisionCanaco,
} from "./membership-paypal.service";
import { MEMBERSHIPS } from "./membership.repository";
import { BILLING } from "../../billing/data-access/billing.repository";
import { SESSION } from "../../auth/data-access/session.repository";
import { of } from "rxjs";

describe("MembershipPaypalService & CANACO Fee Model", () => {
  it("calculates exact CANACO / PayPal MX financial fees (3.6% + $3.00 MXN + 16% IVA)", () => {
    // Para una mensualidad de $550 MXN:
    // Base: 550 * 0.036 + 3.00 = 19.80 + 3.00 = 22.80
    // Con IVA 16%: 22.80 * 1.16 = 26.448 -> 26.45 MXN
    // Monto neto: 550 - 26.45 = 523.55 MXN
    const fee550 = calcularComisionCanaco(550);
    expect(fee550.montoBruto).toBe(550);
    expect(fee550.tarifaPasarela).toBe(26.45);
    expect(fee550.montoNeto).toBe(523.55);

    // Para un plan básico de $350 MXN:
    // Base: 350 * 0.036 + 3.00 = 12.60 + 3.00 = 15.60
    // Con IVA 16%: 15.60 * 1.16 = 18.096 -> 18.10 MXN
    // Monto neto: 350 - 18.10 = 331.90 MXN
    const fee350 = calcularComisionCanaco(350);
    expect(fee350.montoBruto).toBe(350);
    expect(fee350.tarifaPasarela).toBe(18.1);
    expect(fee350.montoNeto).toBe(331.9);

    // Para una anualidad de $5,280 MXN:
    // Base: 5280 * 0.036 + 3.00 = 190.08 + 3.00 = 193.08
    // Con IVA 16%: 193.08 * 1.16 = 223.9728 -> 223.97 MXN
    // Monto neto: 5280 - 223.97 = 5056.03 MXN
    const fee5280 = calcularComisionCanaco(5280);
    expect(fee5280.tarifaPasarela).toBe(223.97);
    expect(fee5280.montoNeto).toBe(5056.03);
  });

  it("can be injected with fallback defaults", () => {
    TestBed.configureTestingModule({
      providers: [
        MembershipPaypalService,
        {
          provide: MEMBERSHIPS,
          useValue: {
            membresiaActual$: of(null),
            loadPlans: () => of([]),
            adquirirOActualizarPlan: () => {},
            renovarMembresia: () => {},
          },
        },
        {
          provide: BILLING,
          useValue: {
            pagos$: of([]),
            registrarPago: () => ({ id: "1", folio: "PAY-1", concepto: "Mensualidad", monto: 550, fecha: "2026-11-22", metodo: "PayPal", estado: "Pagado" }),
            marcarComoPagado: () => {},
            cancelarPago: () => {},
          },
        },
        {
          provide: SESSION,
          useValue: {
            userName$: of("Socio"),
            userRole$: of("guest"),
            upgradeToSubscriber: () => {},
          },
        },
      ],
    });

    const service = TestBed.inject(MembershipPaypalService);
    expect(service).toBeTruthy();
  });
});
