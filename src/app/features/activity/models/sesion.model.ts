export type EstadoSesion = "Reservada" | "Asistida" | "Cancelada" | "Ausente";

export interface SesionHistorial {
  id: string;
  clase: string; // Boxeo, Crossfit, Spinning, Yoga, Pesas
  fecha: string; // YYYY-MM-DD
  turno: "Mañana" | "Tarde" | "Noche";
  estado: EstadoSesion;
  entrenador?: string;
  sala?: string;
}

export interface OcupacionHorario {
  turno: "Mañana" | "Tarde" | "Noche";
  hora: string; // '06:00 – 08:00'
  capacidadMax: number;
  inscritos: number;
  clases: string[];
}

export interface AlertaVencimiento {
  id: string;
  tipo: "membresia" | "sesion" | "pago";
  titulo: string;
  mensaje: string;
  fecha: string; // Fecha del evento
  diasRestantes: number;
  leida: boolean;
  prioridad: "alta" | "media" | "baja";
}
