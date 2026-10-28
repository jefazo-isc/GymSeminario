export interface PerfilSocio {
  nombre: string;
  edad: number;
  peso: number;
  altura: number;
  genero: string;
  objetivo: string;
  diasDisponibles: number;
  nivel: string;
  restriccionesMedicas: string;
}
export function createProfileDraft(): PerfilSocio {
  return {
    nombre: "Socio",
    edad: 24,
    peso: 75,
    altura: 175,
    genero: "Masculino",
    objetivo: "Ganancia muscular",
    diasDisponibles: 4,
    nivel: "Intermedio",
    restriccionesMedicas: "Ninguna",
  };
}
