import { executeAiQuery } from './aiProvider.service.js';
import db, { GYM_EQUIPMENT_CATALOG, todayIso } from './db.js';

export const COACHES = {
  torso: {
    id: 'torso',
    nombre: 'Héctor "Titan" Morales',
    titulo: 'Especialista en Tren Superior (Pecho, Espalda y Brazos)',
    especialidad: 'Tren Superior',
    personalizado: true,
    hasIntroAudio: false,
    emoji: '▲',
    frase: 'Progresión precisa para pecho, espalda, hombros y brazos ajustada a tu JSON, asistencias y cargas.',
    systemPrompt: `Eres Héctor "Titan" Morales, coach personalizado especialista en TREN SUPERIOR (pectorales, dorsal y espalda, deltoides, bíceps, tríceps y antebrazo) en espacioGYM · GROM 21.
Tu personalidad es analítica, técnica, directa y motivadora (cero chistes vacíos).
REGLAS ESTRICTAS DE RESPUESTA:
1. Enfoca siempre tus explicaciones y ejercicios en el tren superior y su sinergia postural (empuje/tracción), usando equipamiento real del gimnasio.
2. Analiza y menciona explícitamente los datos reales del bloque DATOS_REALES_USUARIO_JSON: nombre, peso corporal (kg), IMC, total de asistencias, última clase/fecha de asistencia, peso total movido (kg), récord máximo levantado (kg) y restricciones médicas.
3. Incluye SIEMPRE al menos una tabla en formato Markdown GFM bien estructurada (deja una línea en blanco antes y otra después de la tabla, nunca rompas las barras | ni metas saltos de línea dentro de una celda). Puedes combinar una breve tabla de análisis de tus datos (Asistencia, Recuento de Peso, Peso Corporal) y/o una tabla de prescripción de ejercicios:
| Ejercicio (Tren Superior) | Series x Reps | Carga Sugerida | Enfoque Técnico |`,
  },
  pierna: {
    id: 'pierna',
    nombre: 'Valeria "Apex" Navarro',
    titulo: 'Especialista en Tren Inferior (Cuádriceps, Femoral y Glúteo)',
    especialidad: 'Tren Inferior',
    personalizado: true,
    hasIntroAudio: false,
    emoji: '◆',
    frase: 'Fuerza y simetría en sentadilla, peso muerto y glúteo calibradas con tu historial real.',
    systemPrompt: `Eres Valeria "Apex" Navarro, coach personalizada especialista en TREN INFERIOR (cuádriceps, isquiotibiales/femoral, glúteo mayor/medio, aductores y pantorrilla) en espacioGYM · GROM 21.
Tu enfoque es biomecánico, preciso, cercano y orientado a sobrecarga progresiva segura.
REGLAS ESTRICTAS DE RESPUESTA:
1. Enfoca tus recomendaciones en el tren inferior (patrones de sentadilla, bisagra de cadera, empuje y unilateral), cuidando rodillas y zona lumbar según restricciones médicas.
2. Basa cada consejo en DATOS_REALES_USUARIO_JSON: interpreta su recuento de peso levantado (kg totales y PR máximo), volumen registrado por grupo muscular, asistencias al gimnasio, peso corporal e IMC. Si tiene 0 asistencias o pocos registros en pierna, señálalo y dale un punto de partida realista.
3. Incluye SIEMPRE al menos una tabla en formato Markdown GFM limpia (con línea en blanco antes y después de la tabla, columnas concisas sin saltos internos) resumiendo diagnóstico de métricas y/o rutina de tren inferior:
| Movimiento (Tren Inferior) | Series x Reps | Peso / Intensidad | Descanso y Técnica |`,
  },
  core: {
    id: 'core',
    nombre: 'Mateo "Pulse" Vega',
    titulo: 'Especialista en Core, Abdomen y Recomposición',
    especialidad: 'Core y Recomposición',
    personalizado: true,
    hasIntroAudio: false,
    emoji: '◎',
    frase: 'Control de abdomen, estabilidad lumbar, balance de peso corporal e historial de asistencia.',
    systemPrompt: `Eres Mateo "Pulse" Vega, coach personalizado especialista en ZONA MEDIA (CORE: recto abdominal, oblicuos, transverso y erectores espinales), POSTURA y RECOMPOSICIÓN CORPORAL en espacioGYM · GROM 21.
Tu estilo es estructurado, claro y basado 100% en métricas de progreso.
REGLAS ESTRICTAS DE RESPUESTA:
1. Enfócate en estabilidad de core, anti-extensión/anti-rotación lumbar, frecuencia semanal (asistencias) y control de composición corporal (peso, IMC y gasto energético).
2. Cita directamente los valores de DATOS_REALES_USUARIO_JSON: total de asistencias y constancia, recuento total de peso movido en bitácora (kg), peso corporal actual, evolución reciente de mediciones, objetivo y restricciones médicas.
3. Incluye SIEMPRE al menos una tabla en formato Markdown GFM perfectamente formateada (línea en blanco antes y después, sin saltos dentro de celdas) con el resumen cuantitativo de métricas del socio y el bloque práctico de core/acondicionamiento:
| Métrica o Ejercicio (Core) | Estado / Dosificación | Carga o Tiempo | Objetivo Clave |`,
  },
  patricio: {
    id: 'patricio',
    nombre: 'Patricio Estrella',
    titulo: 'Coach de Volumen y Reposo',
    especialidad: 'Humor y Motivación',
    personalizado: false,
    hasIntroAudio: true,
    emoji: '⭐',
    frase: 'El entrenamiento mental de no hacer nada cuenta como hipertrofia.',
    systemPrompt: `Eres Patricio Estrella de Bob Esponja, pero ahora eres entrenador en este gimnasio.
Hablas de forma inocente, graciosa y medio despistada. Confundes términos de gym con comida (Cangreburgers, helado), levantar rocas gigantes o dormir siestas épicas.
Aconseja al usuario con tu humor característico, usando los datos reales de DATOS_REALES_USUARIO_JSON cuando aporte valor e incluyendo una tabla Markdown simple si recomiendas ejercicios. Usa frases como "La técnica secreta de la roca", "¡Hola, soy Patricio!".`,
  },
  temach: {
    id: 'temach',
    nombre: 'El Temach',
    titulo: 'Comandante del Modo Guerra',
    especialidad: 'Disciplina y Fuerza',
    personalizado: false,
    hasIntroAudio: true,
    emoji: '🪖',
    frase: '¡Póngase en Modo Guerra, mi compa! Cero excusas.',
    systemPrompt: `Eres El Temach. Eres el coach más rudo, motivador y directo del gimnasio.
Hablas con tu jerga inconfundible: "¡Mi compa!", "¡Póngase en modo guerra!", "¡Deje de simpear y vaya a levantar fierros!", "¡A darle con todo!".
Tu misión es exigirle disciplina absoluta al usuario usando sus datos reales de asistencias y peso levantado del JSON para motivarlo o regañarlo con carácter si está faltando.`,
  },
  arnold: {
    id: 'arnold',
    nombre: 'Arnold Schwarzenegger',
    titulo: 'Leyenda del Golden Era',
    especialidad: 'Hipertrofia Clásica',
    personalizado: false,
    hasIntroAudio: true,
    emoji: '🏆',
    frase: 'The pump is the greatest feeling you can get in the gym.',
    systemPrompt: `Eres Arnold Schwarzenegger en su mejor momento de Mr. Olympia en Gold's Gym.
Hablas con el carisma, seguridad y grandeza de Arnold. Usas expresiones como "¡The pump!", "No pain no gain", "Hasta la vista", "Come with me if you want to lift".
Enseñas conexión mente-músculo, técnica estricta y progresión revisando sus marcas reales en el JSON del socio.`,
  },
  barbara: {
    id: 'barbara',
    nombre: 'Bárbara de Regil',
    titulo: 'Coach de Cardio y Sonrisa Positiva',
    especialidad: 'Cardio y Bienestar',
    personalizado: false,
    hasIntroAudio: true,
    emoji: '✨',
    frase: '¡Sonríe, que nadie te quite esta sonrisa! ¡Suda con alegría!',
    systemPrompt: `Eres Bárbara de Regil. Eres súper enérgica, motivadora y con actitud ultra positiva.
Hablas con tus frases icónicas: "¡Sonríe, que nadie te quite esta sonrisa!", "¡Respira!", "¡Es amor propio!", "¡Suda la culpa!".
Motivas al usuario a mantener sus asistencias al día, cuidar su salud y entrenar con alegría.`,
  },
  chavo: {
    id: 'chavo',
    nombre: 'El Chavo Mamado',
    titulo: 'Especialista en Pierna y Sentadilla',
    especialidad: 'Pierna y Humor',
    personalizado: false,
    hasIntroAudio: true,
    emoji: '🧢',
    frase: '¡Zas, zas, y que luego levantaba 200 kilos en sentadilla!',
    systemPrompt: `Eres El Chavo del 8, pero te metiste al gym y ahora estás mamadísimo y nalgón.
Hablas con todas las frases del Chavo: "¡Fue sin querer queriendo!", "¡Es que no me tienen paciencia!", "¡Zas, zas!".
Tu dieta de volumen favorita son las tortas de jamón con aguas frescas. Adviertes que hay que estirar bien para que no te dé la garropera en plena prensa de piernas.`,
  },
};

function parseNumericReps(repsRaw) {
  const match = String(repsRaw ?? '0').match(/[\d.]+/);
  const val = match ? Number(match[0]) : 0;
  return Number.isFinite(val) && val > 0 ? val : 0;
}

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function computeImcValue(pesoKg, alturaCm) {
  const p = Number(pesoKg);
  const h = Number(alturaCm);
  if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(h) || h <= 0) return 0;
  const hM = h < 3 ? h : h / 100;
  return Number((p / (hM * hM)).toFixed(2));
}

/**
 * Construye el JSON unificado del socio combinando SQLite + telemetría del cliente.
 */
export function buildUserJsonContext({
  userEmail = null,
  perfilUsuario = null,
  membresiaResumen = null,
  contextoRutina = null,
  userTelemetry = null,
} = {}) {
  const cleanEmail = userEmail ? String(userEmail).toLowerCase().trim() : '';

  let dbProfile = null;
  let dbMeasurements = [];
  let dbAttendances = [];
  let dbTotalAttendances = 0;
  let dbAttendances30d = 0;
  let dbBookings = [];
  let dbWorkoutLogs = [];
  let dbAssignedRoutine = null;

  if (cleanEmail) {
    try {
      dbProfile = db
        .prepare('SELECT * FROM user_profiles WHERE lower(user_email) = lower(?) LIMIT 1')
        .get(cleanEmail);
      dbMeasurements = db
        .prepare(
          'SELECT fecha, peso, altura, imc, cintura, pecho, brazo, grasa_corporal, restricciones_medicas FROM body_measurements WHERE lower(user_email) = lower(?) ORDER BY fecha DESC, datetime(created_at) DESC LIMIT 5',
        )
        .all(cleanEmail);
      dbTotalAttendances =
        db
          .prepare('SELECT COUNT(*) as total FROM attendances WHERE lower(email) = lower(?)')
          .get(cleanEmail)?.total || 0;
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      dbAttendances30d =
        db
          .prepare(
            'SELECT COUNT(*) as total FROM attendances WHERE lower(email) = lower(?) AND fecha >= ?',
          )
          .get(cleanEmail, since30d)?.total || 0;
      dbAttendances = db
        .prepare(
          'SELECT clase, fecha, hora FROM attendances WHERE lower(email) = lower(?) ORDER BY fecha DESC, datetime(created_at) DESC LIMIT 12',
        )
        .all(cleanEmail);
      dbBookings = db
        .prepare(
          'SELECT entrenamiento, fecha, turno, estado FROM bookings WHERE lower(email) = lower(?) ORDER BY fecha DESC, datetime(created_at) DESC LIMIT 8',
        )
        .all(cleanEmail);
      dbWorkoutLogs = db
        .prepare(
          'SELECT fecha, ejercicio, grupo_muscular, series, repeticiones, peso_kg, rpe, notas FROM workout_logs WHERE lower(user_email) = lower(?) ORDER BY fecha DESC, datetime(created_at) DESC LIMIT 30',
        )
        .all(cleanEmail);
      if (!contextoRutina) {
        const routineRow = db
          .prepare(
            'SELECT titulo, objetivo, nivel, rutina_json FROM assigned_routines WHERE lower(user_email) = lower(?) AND activa = 1 ORDER BY datetime(updated_at) DESC LIMIT 1',
          )
          .get(cleanEmail);
        if (routineRow?.rutina_json) {
          try {
            dbAssignedRoutine = JSON.parse(routineRow.rutina_json);
          } catch {
            dbAssignedRoutine = null;
          }
        }
      }
    } catch (err) {
      console.warn('[COACH_CONTEXT] Error leyendo telemetría SQLite:', err.message);
    }
  }

  const latestMeas = dbMeasurements[0] || null;
  const pesoCorporalKg = Number(
    perfilUsuario?.peso ?? latestMeas?.peso ?? dbProfile?.peso ?? userTelemetry?.recuentoPeso?.pesoCorporalKg ?? 0,
  );
  const alturaCm = Number(
    perfilUsuario?.altura ?? latestMeas?.altura ?? dbProfile?.altura ?? userTelemetry?.recuentoPeso?.alturaCm ?? 0,
  );
  const imc = latestMeas?.imc || computeImcValue(pesoCorporalKg, alturaCm);

  // Consolidar recuento de peso levantado desde SQLite o telemetría enviada por frontend
  const clientLogs = Array.isArray(userTelemetry?.recuentoPeso?.ultimosLevantamientos)
    ? userTelemetry.recuentoPeso.ultimosLevantamientos
    : [];
  const usarDbLogs = dbWorkoutLogs.length > 0;
  const sourceLogs = usarDbLogs
    ? dbWorkoutLogs.map((l) => ({
        fecha: l.fecha,
        ejercicio: l.ejercicio,
        grupoMuscular: l.grupo_muscular || 'General',
        series: Number(l.series || 0),
        repeticiones: parseNumericReps(l.repeticiones),
        pesoKg: Number(l.peso_kg || 0),
        rpe: l.rpe ?? null,
      }))
    : clientLogs.map((l) => ({
        fecha: l.fecha || todayIso(),
        ejercicio: String(l.ejercicio || ''),
        grupoMuscular: String(l.grupoMuscular || 'General'),
        series: Number(l.series || 0),
        repeticiones: parseNumericReps(l.repeticiones),
        pesoKg: Number(l.pesoKg || 0),
        rpe: l.rpe ?? null,
      }));

  let pesoTotalMovidoKg = 0;
  let pesoMaximoLevantadoKg = 0;
  let ejercicioRecord = '';
  const volumenPorGrupoMuscular = {};
  const seriesPorGrupoMuscular = {};

  for (const item of sourceLogs) {
    const vol = item.series * item.repeticiones * item.pesoKg;
    pesoTotalMovidoKg += vol;
    if (item.pesoKg > pesoMaximoLevantadoKg) {
      pesoMaximoLevantadoKg = item.pesoKg;
      ejercicioRecord = item.ejercicio;
    }
    const grupo = item.grupoMuscular || 'General';
    volumenPorGrupoMuscular[grupo] = round2((volumenPorGrupoMuscular[grupo] || 0) + vol);
    seriesPorGrupoMuscular[grupo] = (seriesPorGrupoMuscular[grupo] || 0) + item.series;
  }

  if (!usarDbLogs && Number(userTelemetry?.recuentoPeso?.pesoTotalLevantadoKg) > pesoTotalMovidoKg) {
    pesoTotalMovidoKg = Number(userTelemetry.recuentoPeso.pesoTotalLevantadoKg);
  }
  if (!usarDbLogs && Number(userTelemetry?.recuentoPeso?.pesoMaximoKg) > pesoMaximoLevantadoKg) {
    pesoMaximoLevantadoKg = Number(userTelemetry.recuentoPeso.pesoMaximoKg);
    ejercicioRecord = userTelemetry.recuentoPeso.ejercicioRecord || ejercicioRecord;
  }

  const clientAttendances = Array.isArray(userTelemetry?.asistencia?.asistenciasRecientes)
    ? userTelemetry.asistencia.asistenciasRecientes
    : [];
  const totalAsistencias = Math.max(
    dbTotalAttendances,
    Number(userTelemetry?.asistencia?.totalAsistencias || 0),
  );
  const asistenciasPorClase = {};
  for (const a of dbAttendances.length ? dbAttendances : clientAttendances) {
    const cls = a.clase || 'General';
    asistenciasPorClase[cls] = (asistenciasPorClase[cls] || 0) + 1;
  }

  return {
    socio: {
      nombre: perfilUsuario?.nombre || dbProfile?.nombre || 'Socio',
      edad: Number(perfilUsuario?.edad ?? dbProfile?.edad ?? 0) || null,
      genero: perfilUsuario?.genero || dbProfile?.genero || 'No especificado',
      objetivo: perfilUsuario?.objetivo || dbProfile?.objetivo || 'Salud y rendimiento',
      nivel: perfilUsuario?.nivel || dbProfile?.nivel || 'Intermedio',
      diasDisponibles: Number(
        perfilUsuario?.diasDisponibles ?? dbProfile?.dias_disponibles ?? 4,
      ),
      pesoCorporalKg: pesoCorporalKg || null,
      alturaCm: alturaCm || null,
      imc: imc || null,
      restriccionesMedicas:
        perfilUsuario?.restriccionesMedicas ||
        dbProfile?.restricciones_medicas ||
        'Ninguna',
    },
    membresia: membresiaResumen
      ? {
          plan: membresiaResumen.plan_nombre || membresiaResumen.nombrePlan || 'Activo',
          estado: membresiaResumen.estado || 'Activa',
          vigenciaHasta:
            membresiaResumen.fecha_fin || membresiaResumen.fechaFin || 'Vigente',
        }
      : { plan: 'Activa', estado: 'Activa' },
    asistencia: {
      totalAsistencias,
      asistenciasUltimos30Dias: Math.max(
        dbAttendances30d,
        dbAttendances.length ? dbAttendances30d : totalAsistencias,
      ),
      ultimaAsistencia: dbAttendances[0] || clientAttendances[0] || null,
      clasesPorDisciplina: asistenciasPorClase,
      asistenciasRecientes: (dbAttendances.length ? dbAttendances : clientAttendances).slice(0, 8),
      reservasProximas: dbBookings.slice(0, 5),
    },
    recuentoPesoYEntrenamiento: {
      totalRegistrosBitacora: Math.max(
        sourceLogs.length,
        Number(userTelemetry?.recuentoPeso?.totalRegistrosEntrenamiento || 0),
      ),
      pesoTotalMovidoKg: round2(pesoTotalMovidoKg),
      pesoMaximoLevantadoKg: round2(pesoMaximoLevantadoKg),
      ejercicioRecord: ejercicioRecord || null,
      volumenPorGrupoMuscular,
      seriesPorGrupoMuscular,
      ultimosLevantamientos: sourceLogs.slice(0, 8),
    },
    medicionesCorporalesRecientes: dbMeasurements,
    rutinaActiva: contextoRutina || dbAssignedRoutine || null,
  };
}

/**
 * Procesa el chat con el coach seleccionado inyectando equipamiento, membresía y JSON completo del socio.
 */
export async function chatearConCoach({
  coachId,
  mensaje,
  historial = [],
  contextoRutina = null,
  perfilUsuario = null,
  membresiaResumen = null,
  userEmail = null,
  userTelemetry = null,
}) {
  const coach = COACHES[coachId] || COACHES.temach;
  const userJson = buildUserJsonContext({
    userEmail,
    perfilUsuario,
    membresiaResumen,
    contextoRutina,
    userTelemetry,
  });

  let systemContent = `${coach.systemPrompt}\n\n`;
  systemContent += `EQUIPAMIENTO Y SERVICIOS DEL GIMNASIO (espacioGYM · GROM 21 - úsalo para responder dudas sobre máquinas, clases u horarios):\n${GYM_EQUIPMENT_CATALOG.map((item) => `- ${item}`).join('\n')}\n\n`;
  systemContent += `FORMATO DE TABLAS MARKDOWN OBLIGATORIO:\n- Siempre que presentes comparativas, progreso, asistencias, recuento de peso o ejercicios, usa tablas Markdown GFM limpias con una línea en blanco antes y otra después.\n- No pongas barras "|" extras ni saltos de línea dentro de las celdas.\n\n`;
  systemContent += `DATOS_REALES_USUARIO_JSON (fuente oficial de perfil, membresía, asistencias y recuento de peso levantado; úsalo para personalizar con precisión cada respuesta):\n\`\`\`json\n${JSON.stringify(userJson, null, 2)}\n\`\`\`\n`;

  const messages = [{ role: 'system', content: systemContent }];

  for (const h of historial.slice(-6)) {
    messages.push({
      role: h.remitente === 'usuario' ? 'user' : 'assistant',
      content: h.texto,
    });
  }
  messages.push({ role: 'user', content: mensaje });

  try {
    const { text, origen } = await executeAiQuery(messages, {
      temperature: coach.personalizado ? 0.65 : 0.85,
      maxTokens: 1300,
    });
    return {
      exito: true,
      coach: coach.nombre,
      origen,
      respuesta: text.trim(),
    };
  } catch (error) {
    console.error('[ERROR COACH_CHAT]:', error.message);
    return {
      exito: false,
      coach: coach.nombre,
      respuesta: `(${coach.nombre} está tomando un respiro o hidratándose. ¡Inténtalo de nuevo en un momento!)`,
    };
  }
}
