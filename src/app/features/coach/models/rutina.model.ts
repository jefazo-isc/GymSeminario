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
  especialidad?: string;
  personalizado?: boolean;
  hasIntroAudio?: boolean;
  hasVoice?: boolean;
  voiceStyle?: string;
}

export interface MensajeChat {
  remitente: "usuario" | "coach";
  texto: string;
  hora: string;
  coachId?: string;
  hasVoice?: boolean;
  audioSrc?: string;
  audioOrigen?: "chatterbox" | "gemini-tts" | "cache" | "local";
  cargandoAudio?: boolean;
  reproduciendo?: boolean;
}

export interface RespuestaChat {
  exito: boolean;
  coach: string;
  respuesta: string;
  audioBase64?: string;
  mimeType?: string;
  audioOrigen?: "chatterbox" | "gemini-tts" | "cache";
}

export interface RespuestaVozCoach {
  exito: boolean;
  coachId?: string;
  voiceUsed?: string;
  origen?: "chatterbox" | "gemini-tts" | "cache";
  mimeType?: string;
  audioBase64?: string;
  error?: string;
}

export interface SavedRoutineRecord {
  id: string | number;
  userEmail: string;
  assignedBy?: string | null;
  updatedAt?: string;
  rutina: RutinaData;
}

export interface SaveRoutinePayload {
  rutina: RutinaData;
  targetEmail?: string;
  assignedBy?: string;
}

export interface CoachWorkoutSummary {
  ejercicio: string;
  grupoMuscular: string;
  series: number;
  repeticiones: number;
  pesoKg: number;
  volumenKg: number;
  fecha: string;
  rpe?: number;
}

export interface CoachAttendanceSummary {
  totalAsistencias: number;
  totalReservas: number;
  asistenciasRecientes: Array<{
    clase: string;
    fecha: string;
    turno: string;
    estado: string;
  }>;
}

export interface CoachUserTelemetry {
  asistencia: CoachAttendanceSummary;
  recuentoPeso: {
    pesoCorporalKg: number;
    alturaCm: number;
    imc: number;
    totalRegistrosEntrenamiento: number;
    pesoTotalLevantadoKg: number;
    pesoMaximoKg: number;
    ejercicioRecord: string;
    volumenPorGrupoMuscular: Record<string, number>;
    ultimosLevantamientos: CoachWorkoutSummary[];
  };
}

export interface CoachChatContext {
  membershipSummary?: string;
  equipmentContext?: string;
  userTelemetry?: CoachUserTelemetry;
}
