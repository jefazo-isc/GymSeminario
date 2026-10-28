import { Pago, ResumenCuenta } from "./pago.model";
export function summarizePayments(pagos: Pago[]): ResumenCuenta {
  const paid = pagos.filter((p) => p.estado === "Pagado");
  return {
    pagos,
    totalPagado: paid.reduce((sum, p) => sum + p.monto, 0),
    totalPendiente: pagos
      .filter((p) => p.estado === "Pendiente")
      .reduce((sum, p) => sum + p.monto, 0),
    ultimoPago:
      [...paid].sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? null,
  };
}
