export interface LegacySession {
  nombre: string;
  usuario: string;
  hora: string;
  sesiones: number;
}
export const isLegacySession = (v: unknown): v is LegacySession =>
  !!v &&
  typeof v === "object" &&
  "nombre" in v &&
  typeof v.nombre === "string" &&
  "usuario" in v &&
  typeof v.usuario === "string" &&
  "hora" in v &&
  typeof v.hora === "string" &&
  "sesiones" in v &&
  (typeof v.sesiones === "number" || typeof v.sesiones === "string");
