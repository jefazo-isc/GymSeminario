// Mercury (Inception Labs) — API compatible con OpenAI
const MERCURY_BASE_URL = process.env.MERCURY_BASE_URL || 'https://api.inceptionlabs.ai/v1';
const MERCURY_API_KEY  = process.env.MERCURY_API_KEY;
const MERCURY_MODEL    = process.env.MERCURY_MODEL || 'mercury-2';

// Gemini (Google) — Fallback automático y robusto
const GEMINI_API_KEY   = process.env.GEMINI_API_KEY || 'AIzaSyBk2ZXp0bHSH6CG_AehB0oU6EJQzrJk0Z4';
const GEMINI_MODELS    = ['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemma-4-26b-a4b-it', 'gemma-4-31b-it'];

// Cache en memoria (TTL: 12 horas)
const cacheRutinas = new Map();
const TTL_CACHE_MS = 12 * 60 * 60 * 1000;

/**
 * Llama a la API de Mercury (formato OpenAI)
 */
async function mercuryChat(messages, { temperature = 0.3, maxTokens = 3500 } = {}) {
  if (!MERCURY_API_KEY) throw new Error('MERCURY_API_KEY no configurada');
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
      max_tokens: maxTokens,
      response_format: { type: 'json_object' }
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
 * Llama a la API de Gemini (Google) como fallback resiliente
 */
async function geminiChat(messages, { temperature = 0.3, maxTokens = 8192 } = {}) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY no configurada');

  const contents = [];
  let systemInstruction = null;
  for (const m of messages) {
    if (m.role === 'system') {
      systemInstruction = m.content;
    } else {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      });
    }
  }

  const body = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json'
    }
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const errText = await resp.text();
        lastError = new Error(`Gemini (${model}) ${resp.status}: ${errText}`);
        continue;
      }

      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Todos los modelos de Gemini fallaron.');
}

/**
 * Intenta Mercury primero; si falla, recurre a Gemini
 */
async function aiChat(messages, opts = {}) {
  if (MERCURY_API_KEY) {
    try {
      const text = await mercuryChat(messages, opts);
      if (text && text.trim()) {
        return { text, origen: 'mercury' };
      }
    } catch (mercuryErr) {
      console.warn('[RUTINA] Mercury falló, usando Gemini como respaldo:', mercuryErr.message);
    }
  } else {
    console.info('[RUTINA] Usando Gemini para generación de rutina.');
  }

  const text = await geminiChat(messages, opts);
  return { text, origen: 'gemini' };
}

/**
 * Normaliza y valida la rutina para asegurar compatibilidad estricta con validRoutine
 */
function normalizarRutina(raw, perfil) {
  const r = typeof raw === 'object' && raw !== null ? raw : {};
  return {
    tituloRutina: String(r.tituloRutina || `Rutina Personalizada para ${perfil?.nombre || 'Socio'}`),
    objetivo: String(r.objetivo || perfil?.objetivo || 'Acondicionamiento físico'),
    nivelRecomendado: String(r.nivelRecomendado || perfil?.nivel || 'Intermedio'),
    recomendacionesGenerales: String(r.recomendacionesGenerales || 'Mantén una buena hidratación, calienta 10 minutos antes de comenzar y descansa adecuadamente.'),
    diasSemana: Array.isArray(r.diasSemana) && r.diasSemana.length > 0
      ? r.diasSemana.map((d, i) => ({
          dia: String(d.dia || `Día ${i + 1}`),
          grupoMuscular: String(d.grupoMuscular || 'General'),
          ejercicios: Array.isArray(d.ejercicios) && d.ejercicios.length > 0
            ? d.ejercicios.map(e => ({
                nombre: String(e.nombre || 'Ejercicio'),
                series: Number(e.series) > 0 ? Number(e.series) : 3,
                repeticiones: String(e.repeticiones || '10-12'),
                descansoSegundos: Number(e.descansoSegundos) >= 0 ? Number(e.descansoSegundos) : 60,
                notasCoach: String(e.notasCoach || 'Mantener postura controlada.')
              }))
            : [
                { nombre: 'Sentadillas', series: 4, repeticiones: '10-12', descansoSegundos: 90, notasCoach: 'Espalda recta' },
                { nombre: 'Flexiones / Press', series: 4, repeticiones: '8-10', descansoSegundos: 90, notasCoach: 'Control de bajada' }
              ]
        }))
      : [
          {
            dia: 'Día 1',
            grupoMuscular: 'Cuerpo Completo',
            ejercicios: [
              { nombre: 'Sentadilla libre', series: 4, repeticiones: '10-12', descansoSegundos: 90, notasCoach: 'Mantener la espalda recta.' },
              { nombre: 'Press de banca', series: 4, repeticiones: '8-10', descansoSegundos: 90, notasCoach: 'Control en el descenso.' },
              { nombre: 'Jalón al pecho', series: 3, repeticiones: '10-12', descansoSegundos: 60, notasCoach: 'Escápulas atrás y abajo.' }
            ]
          }
        ]
  };
}

/**
 * Genera rutina de entrenamiento personalizada
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
  } = perfilSocio || {};

  const claveCache = `${String(nombre).trim().toLowerCase()}_${peso}_${altura}_${String(objetivo).trim().toLowerCase()}_${diasDisponibles}_${String(nivel).trim().toLowerCase()}`;
  const enCache = cacheRutinas.get(claveCache);
  if (enCache && Date.now() - enCache.timestamp < TTL_CACHE_MS) {
    return { exito: true, origen: 'cache', data: enCache.data };
  }

  const prompt = `Eres un entrenador físico profesional de alto nivel. Diseña una rutina de entrenamiento personalizada y devuelve ÚNICAMENTE un objeto JSON válido con exactamente esta estructura (sin texto adicional ni markdown):
{
  "tituloRutina": "Nombre motivador de la rutina",
  "objetivo": "${objetivo}",
  "nivelRecomendado": "${nivel}",
  "diasSemana": [
    {
      "dia": "Día 1 - Lunes",
      "grupoMuscular": "Pecho y Tríceps",
      "ejercicios": [
        {
          "nombre": "Press de banca plano",
          "series": 4,
          "repeticiones": "10-12",
          "descansoSegundos": 90,
          "notasCoach": "Bajar controlado y no rebotar en el pecho."
        }
      ]
    }
  ],
  "recomendacionesGenerales": "Recomendaciones de nutrición, calentamiento y descanso."
}

Perfil del socio:
- Nombre: ${nombre}
- Género: ${genero}
- Edad: ${edad} años
- Peso: ${peso} kg
- Altura: ${altura} cm
- Objetivo: ${objetivo}
- Días disponibles por semana: ${diasDisponibles} días
- Nivel de experiencia: ${nivel}
- Lesiones o restricciones: ${restriccionesMedicas}`;

  try {
    const { text: raw, origen } = await aiChat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 8192 }
    );

    // Extraer JSON limpio
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No se encontró JSON en la respuesta de la IA');

    const datosCrudos = JSON.parse(match[0]);
    const datosNormalizados = normalizarRutina(datosCrudos, perfilSocio);

    cacheRutinas.set(claveCache, { data: datosNormalizados, timestamp: Date.now() });

    return { exito: true, origen, data: datosNormalizados };
  } catch (error) {
    console.error('[ERROR RUTINA IA]:', error.message);

    return {
      exito: false,
      error: 'No se pudo conectar con el servicio de IA. Se devuelve una plantilla base.',
      data: {
        tituloRutina: `Rutina General de Mantenimiento (${nivel})`,
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
