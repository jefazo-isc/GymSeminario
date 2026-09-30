import { GoogleGenAI, Type } from "@google/genai";

// Inicializamos el cliente de Gemini utilizando la API Key guardada en variables de entorno
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Mantenemos un modelo fijo, veloz y económico por defecto
const MODELO_GEMINI = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Cache en memoria para ahorrar llamadas repetidas (TTL: 12 horas)
const cacheRutinas = new Map();
const TTL_CACHE_MS = 12 * 60 * 60 * 1000;

// Esquema JSON estricto que debe devolver la IA
const esquemaRutina = {
  type: Type.OBJECT,
  properties: {
    tituloRutina: { type: Type.STRING },
    objetivo: { type: Type.STRING },
    nivelRecomendado: { type: Type.STRING },
    diasSemana: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dia: { type: Type.STRING },
          grupoMuscular: { type: Type.STRING },
          ejercicios: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nombre: { type: Type.STRING },
                series: { type: Type.INTEGER },
                repeticiones: { type: Type.STRING },
                descansoSegundos: { type: Type.INTEGER },
                notasCoach: { type: Type.STRING }
              },
              required: ["nombre", "series", "repeticiones", "descansoSegundos"]
            }
          }
        },
        required: ["dia", "grupoMuscular", "ejercicios"]
      }
    },
    recomendacionesGenerales: { type: Type.STRING }
  },
  required: ["tituloRutina", "objetivo", "nivelRecomendado", "diasSemana", "recomendacionesGenerales"]
};

/**
 * Genera una rutina personalizada estructurada a partir del perfil del socio.
 * @param {Object} perfilSocio - Datos del cliente (ej. edad, objetivo, diasDisponibles, nivel, lesiones)
 * @returns {Promise<Object>} Objeto JSON estructurado con la rutina generada.
 */
export async function generarRutinaEntrenamiento(perfilSocio) {
  const {
    nombre = "Socio",
    edad = 25,
    peso = 70,
    altura = 170,
    genero = "No especificado",
    objetivo = "Ganancia muscular",
    diasDisponibles = 4,
    nivel = "Intermedio",
    restriccionesMedicas = "Ninguna"
  } = perfilSocio;

  // Clave de caché para no gastar cuota si se piden los mismos datos
  const claveCache = `${nombre.trim().toLowerCase()}_${peso}_${altura}_${objetivo.trim().toLowerCase()}_${diasDisponibles}_${nivel.trim().toLowerCase()}_${restriccionesMedicas.trim().toLowerCase()}`;
  const enCache = cacheRutinas.get(claveCache);
  if (enCache && Date.now() - enCache.timestamp < TTL_CACHE_MS) {
    return {
      exito: true,
      origen: "cache",
      data: enCache.data
    };
  }

  const prompt = `
Eres un entrenador físico y coach deportivo profesional de un centro de acondicionamiento físico.
Debes diseñar una rutina de entrenamiento personalizada con base en el siguiente perfil biomecánico del cliente:

- Nombre: ${nombre}
- Edad: ${edad} años
- Peso corporal: ${peso} kg
- Altura: ${altura} cm
- Género: ${genero}
- Objetivo principal: ${objetivo}
- Días disponibles a la semana: ${diasDisponibles} días
- Nivel de experiencia: ${nivel}
- Restricciones médicas o lesiones: ${restriccionesMedicas}

REGLAS DE GENERACIÓN:
1. Adapta la intensidad, ejercicios y descansos considerando el peso (${peso} kg), la altura (${altura} cm) y el objetivo (${objetivo}).
2. Diseña únicamente la cantidad de días solicitada (${diasDisponibles} días).
3. Asigna entre 3 y 5 ejercicios clave por cada día de entrenamiento.
4. El descanso entre series debe expresarse en segundos enteros (ejemplo: 60, 90, 120).
5. Sé preciso, profesional y directo en las recomendaciones.
`;

  try {
    const respuesta = await ai.models.generateContent({
      model: MODELO_GEMINI,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: esquemaRutina,
        temperature: 0.3
      }
    });

    const datosFormateados = JSON.parse(respuesta.text);
    // Guardar en caché para reusar y proteger cuota
    cacheRutinas.set(claveCache, { data: datosFormateados, timestamp: Date.now() });

    return {
      exito: true,
      origen: "gemini",
      data: datosFormateados
    };
  } catch (error) {
    console.error("[ERROR EN RUTINE_COACH_SERVICE]:", error);

    // Mecanismo de respuesta de respaldo (fallback) si falla la API o se excede la cuota
    return {
      exito: false,
      error: "No se pudo conectar con el servicio de IA. Se devuelve una plantilla base.",
      data: {
        tituloRutina: "Rutina General de Mantenimiento (Modo Respaldo)",
        objetivo: objetivo,
        nivelRecomendado: nivel,
        diasSemana: [
          {
            dia: "Día 1",
            grupoMuscular: "Cuerpo Completo / General",
            ejercicios: [
              {
                nombre: "Sentadilla libre",
                series: 4,
                repeticiones: "10-12",
                descansoSegundos: 90,
                notasCoach: "Mantener la espalda recta durante todo el movimiento."
              },
              {
                nombre: "Flexiones de pecho",
                series: 3,
                repeticiones: "12-15",
                descansoSegundos: 60,
                notasCoach: "Controlar el descenso."
              }
            ]
          }
        ],
        recomendacionesGenerales: "Por favor, mantén una buena hidratación y consulta con un entrenador en la sala si la IA no está disponible momentáneamente."
      }
    };
  }
}
