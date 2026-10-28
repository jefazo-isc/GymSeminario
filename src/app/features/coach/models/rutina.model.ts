export interface EjercicioRutina {
  nombre: string;
  series: number;
  repeticiones: string;
  descansoSegundos: number;
  notasCoach?: string;
}

export interface DiaRutina {
  dia: string;
  grupoMuscular: string;
  ejercicios: EjercicioRutina[];
}

export interface RutinaData {
  tituloRutina: string;
  objetivo: string;
  nivelRecomendado: string;
  diasSemana: DiaRutina[];
  recomendacionesGenerales: string;
}

export type { PerfilSocio } from "../../profile/models/profile.model";

export interface RespuestaRutina {
  exito: boolean;
  origen?: "gemini" | "cache";
  data: RutinaData;
  error?: string;
}

export interface CoachInfo {
  id: string;
  nombre: string;
  titulo: string;
  emoji: string;
  frase: string;
}

export interface MensajeChat {
  remitente: "usuario" | "coach";
  texto: string;
  hora: string;
}

export interface RespuestaChat {
  exito: boolean;
  coach: string;
  respuesta: string;
}
