import { executeAiQuery } from './aiProvider.service.js';

// Cache en memoria (TTL: 12 horas)
const cacheRutinas = new Map();
const TTL_CACHE_MS = 12 * 60 * 60 * 1000;

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
    const { text: raw, origen } = await executeAiQuery(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 8192, jsonMode: true }
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
