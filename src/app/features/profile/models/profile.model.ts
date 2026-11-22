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

export interface BodyMeasurement {
  id?: string | number;
  peso: number;
  altura: number;
  imc: number;
  cintura?: number | null;
  pecho?: number | null;
  brazo?: number | null;
  grasaCorporal?: number | null;
  restriccionesMedicas?: string;
  notas?: string;
  fecha?: string;
  createdAt?: string;
}

export interface MeasurementInput {
  peso: number;
  altura: number;
  cintura?: number | null;
  pecho?: number | null;
  brazo?: number | null;
  grasaCorporal?: number | null;
  restriccionesMedicas?: string;
  notas?: string;
}

export function calculateBmi(peso: number, alturaCm: number): number {
  if (!Number.isFinite(peso) || !Number.isFinite(alturaCm) || peso <= 0 || alturaCm <= 0) {
    return 0;
  }
  return Number((peso / (alturaCm / 100) ** 2).toFixed(1));
}

export function bmiCategory(imc: number): string {
  if (imc <= 0) return "Sin calcular";
  if (imc < 18.5) return "Bajo peso";
  if (imc < 25) return "Peso saludable";
  if (imc < 30) return "Sobrepeso";
  return "Obesidad";
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
