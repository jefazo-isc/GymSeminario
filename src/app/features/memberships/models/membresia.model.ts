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
  autoRenew?: boolean;
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

export interface MembershipHistoryEntry {
  id: string | number;
  userEmail?: string;
  planNombre: string;
  precio: number;
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  action?: string;
  createdAt?: string;
}

export interface AdminMembershipAssignPayload {
  email: string;
  action: "assign" | "renew" | "cancel" | "extend";
  planNombre?: "Básico" | "Pro Fitness" | "Black Elite";
  precio?: number;
  periodo?: "Mensual" | "Trimestral" | "Anual";
  dias?: number;
}
