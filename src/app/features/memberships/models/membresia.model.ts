export interface Membresia {
  id: string;
  nombrePlan: "Básico" | "Pro Fitness" | "Black Elite";
  precio: number;
  periodo: "Mensual" | "Trimestral" | "Anual";
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
  estado: "Activa" | "Por vencer" | "Vencida";
  beneficios: string[];
  diasRestantes?: number;
}

export interface PlanCatalogo {
  id: string;
  nombre: "Básico" | "Pro Fitness" | "Black Elite";
  precio: number;
  periodo: string;
  popular?: boolean;
  descripcion: string;
  beneficios: string[];
}
