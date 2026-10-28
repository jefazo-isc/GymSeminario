export interface LibraryExercise {
  nombre: string;
  series: number | string;
  repeticiones: number | string;
  equipo: string;
}
export interface ExerciseGroup {
  parte: string;
  ejercicios: LibraryExercise[];
}
export interface ExerciseCatalog {
  datosPorParte: ExerciseGroup[];
}
