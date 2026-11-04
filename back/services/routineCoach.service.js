// Mercury (Inception Labs) — API compatible con OpenAI
const MERCURY_BASE_URL = process.env.MERCURY_BASE_URL || 'https://api.inceptionlabs.ai/v1';
const MERCURY_API_KEY  = process.env.GEMINI_API_KEY;
const MERCURY_MODEL    = process.env.GEMINI_MODEL   || 'mercury-coder-small';

// Cache en memoria (TTL: 12 horas)
const cacheRutinas = new Map();
const TTL_CACHE_MS = 12 * 60 * 60 * 1000;

async function mercuryChat(messages, { temperature = 0.3, maxTokens = 1200 } = {}) {
  const resp = await fetch(`${MERCURY_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MERCURY_API_KEY}`
    },
    body: JSON.stringify({
      model: MERCURY_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Mercury API ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Genera rutina de entrenamiento personalizada usando Mercury
 */
export async function generarRutinaEntrenamiento(perfilSocio) {
  const {
    nombre = 'Socio',
    edad = 25,
    peso = 70,
    altura = 170,
    genero = 'No especificado',
    objetivo = 'Ganancia muscular',
    diasDisponibles = 4,
    nivel = 'Intermedio',
    restriccionesMedicas = 'Ninguna'
  } = perfilSocio;

  const claveCache = `${nombre.trim().toLowerCase()}_${peso}_${altura}_${objetivo.trim().toLowerCase()}_${diasDisponibles}_${nivel.trim().toLowerCase()}`;
  const enCache = cacheRutinas.get(claveCache);
  if (enCache && Date.now() - enCache.timestamp < TTL_CACHE_MS) {
    return { exito: true, origen: 'cache', data: enCache.data };
  }

  const prompt = `Eres un entrenador físico profesional. Diseña una rutina de entrenamiento personalizada y devuelve ÚNICAMENTE un JSON válido sin markdown ni texto extra.

Perfil del cliente:
- Nombre: ${nombre}
- Edad: ${edad} años
- Peso: ${peso} kg
- Altura: ${altura} cm
- Género: ${genero}
- Objetivo: ${objetivo}
- Días disponibles: ${diasDisponibles}
- Nivel: ${nivel}
- Restricciones: ${restriccionesMedicas}

Devuelve exactamente este JSON (sin texto adicional):
{
  "tituloRutina": "string",
  "objetivo": "string",
  "nivelRecomendado": "string",
  "diasSemana": [
    {
      "dia": "Día 1",
      "grupoMuscular": "string",
      "ejercicios": [
        {
          "nombre": "string",
          "series": 4,
          "repeticiones": "10-12",
          "descansoSegundos": 90,
          "notasCoach": "string"
        }
      ]
    }
  ],
  "recomendacionesGenerales": "string"
}`;

  try {
    const raw = await mercuryChat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 1500 }
    );

    // Extraer JSON aunque Mercury ponga texto antes/después
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No se encontró JSON en la respuesta');

    const datosFormateados = JSON.parse(match[0]);
    cacheRutinas.set(claveCache, { data: datosFormateados, timestamp: Date.now() });

    return { exito: true, origen: 'mercury', data: datosFormateados };
  } catch (error) {
    console.error('[ERROR RUTINA Mercury]:', error.message);

    return {
      exito: false,
      error: 'No se pudo conectar con el servicio de IA. Se devuelve una plantilla base.',
      data: {
        tituloRutina: 'Rutina General de Mantenimiento (Modo Respaldo)',
        objetivo,
        nivelRecomendado: nivel,
        diasSemana: [
          {
            dia: 'Día 1',
            grupoMuscular: 'Cuerpo Completo / General',
            ejercicios: [
              { nombre: 'Sentadilla libre', series: 4, repeticiones: '10-12', descansoSegundos: 90, notasCoach: 'Mantener la espalda recta.' },
              { nombre: 'Press de banca', series: 4, repeticiones: '8-10', descansoSegundos: 90, notasCoach: 'Control en el descenso.' },
              { nombre: 'Jalón al pecho', series: 3, repeticiones: '10-12', descansoSegundos: 60, notasCoach: 'Escápulas atrás y abajo.' }
            ]
          }
        ],
        recomendacionesGenerales: 'Mantén buena hidratación y consulta con un entrenador si necesitas ajustes.'
      }
    };
  }
}
