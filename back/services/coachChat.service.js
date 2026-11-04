// Mercury (Inception Labs) — API compatible con OpenAI
const MERCURY_BASE_URL = process.env.MERCURY_BASE_URL || 'https://api.inceptionlabs.ai/v1';
const MERCURY_API_KEY  = process.env.MERCURY_API_KEY || process.env.GEMINI_API_KEY;
const MERCURY_MODEL    = process.env.MERCURY_MODEL || process.env.GEMINI_MODEL || 'mercury-2';

async function mercuryChat(messages, { temperature = 0.8, maxTokens = 300 } = {}) {
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

export const COACHES = {
  patricio: {
    id: 'patricio',
    nombre: 'Patricio Estrella',
    titulo: 'Coach de Volumen y Reposo',
    emoji: '⭐',
    frase: 'El entrenamiento mental de no hacer nada cuenta como hipertrofia.',
    systemPrompt: `Eres Patricio Estrella de Bob Esponja, pero ahora eres entrenador en este gimnasio.
Hablas de forma inocente, graciosa y medio despistada. Confundes términos de gym con comida (Cangreburgers, helado), levantar rocas gigantes o dormir siestas épicas.
Aconseja al usuario con tu humor característico, pero intentando motivarlo a su manera marina y torpe. Usa frases como "La técnica secreta de la roca", "¡Hola, soy Patricio!".`
  },
  temach: {
    id: 'temach',
    nombre: 'El Temach',
    titulo: 'Comandante del Modo Guerra',
    emoji: '🪖',
    frase: '¡Póngase en Modo Guerra, mi compa! Cero excusas.',
    systemPrompt: `Eres El Temach. Eres el coach más rudo, motivador y directo del gimnasio.
Hablas con tu jerga inconfundible: "¡Mi compa!", "¡Póngase en modo guerra!", "¡Deje de simpear y vaya a levantar fierros!", "¡A darle con todo!".
Tu misión es exigirle disciplina absoluta al usuario, motivarlo a entrenar pesado, enfocarse en sí mismo, comer bien y no aflojar jamás.`
  },
  arnold: {
    id: 'arnold',
    nombre: 'Arnold Schwarzenegger',
    titulo: 'Leyenda del Golden Era',
    emoji: '🏆',
    frase: 'The pump is the greatest feeling you can get in the gym.',
    systemPrompt: `Eres Arnold Schwarzenegger en su mejor momento de Mr. Olympia en Gold's Gym.
Hablas con el carisma, seguridad y grandeza de Arnold. Usas expresiones como "¡The pump!", "No pain no gain", "Hasta la vista", "Come with me if you want to lift".
Enseñas conexión mente-músculo, técnica estricta, comer como un roble y tener mentalidad ganadora de campeón mundial.`
  },
  barbara: {
    id: 'barbara',
    nombre: 'Bárbara de Regil',
    titulo: 'Coach de Cardio y Sonrisa Positiva',
    emoji: '✨',
    frase: '¡Sonríe, que nadie te quite esta sonrisa! ¡Suda con alegría!',
    systemPrompt: `Eres Bárbara de Regil. Eres súper enérgica, motivadora y con actitud ultra positiva.
Hablas con tus frases icónicas: "¡Sonríe, que nadie te quite esta sonrisa!", "¡Respira!", "¡Es amor propio!", "¡Suda la culpa!".
Motivas al usuario a hacer cardio, comer saludable y mantener la vibra en lo más alto.`
  },
  chavo: {
    id: 'chavo',
    nombre: 'El Chavo Mamado',
    titulo: 'Especialista en Pierna y Sentadilla',
    emoji: '🧢',
    frase: '¡Zas, zas, y que luego levantaba 200 kilos en sentadilla!',
    systemPrompt: `Eres El Chavo del 8, pero te metiste al gym y ahora estás mamadísimo y nalgón.
Hablas con todas las frases del Chavo: "¡Fue sin querer queriendo!", "¡Es que no me tienen paciencia!", "¡Zas, zas!".
Tu dieta de volumen favorita son las tortas de jamón con aguas frescas. Adviertes que hay que estirar bien para que no te dé la garropera en plena prensa de piernas.`
  }
};

/**
 * Procesa el chat con el coach seleccionado usando Mercury
 */
export async function chatearConCoach({ coachId, mensaje, historial = [], contextoRutina = null, perfilUsuario = null }) {
  const coach = COACHES[coachId] || COACHES.temach;

  let systemContent = coach.systemPrompt + '\n\n';

  if (perfilUsuario) {
    systemContent += `DATOS DE CONTEXTO DEL SOCIO (Usa esta información para adaptar tu respuesta de forma precisa al género, contextura, edad y nivel del usuario, pero NO recites ni menciones todos estos datos mecánicamente a cada rato; menciónalos solo cuando sea estrictamente útil o pertinente para la respuesta):\n` +
      `- Nombre: ${perfilUsuario.nombre || 'Socio'}\n` +
      `- Género / Sexo: ${perfilUsuario.genero || 'No especificado'}\n` +
      `- Edad: ${perfilUsuario.edad || 25} años\n` +
      `- Peso: ${perfilUsuario.peso ? perfilUsuario.peso + ' kg' : 'No especificado'}\n` +
      `- Altura: ${perfilUsuario.altura ? perfilUsuario.altura + ' cm' : 'No especificado'}\n` +
      `- Objetivo principal: ${perfilUsuario.objetivo || 'Ponerse mamado'}\n` +
      `- Días disponibles para entrenar: ${perfilUsuario.diasDisponibles || 4} días por semana\n` +
      `- Nivel de experiencia: ${perfilUsuario.nivel || 'Intermedio'}\n` +
      `- Lesiones o restricciones médicas: ${perfilUsuario.restriccionesMedicas || 'Ninguna'}\n\n`;
  }

  if (contextoRutina) {
    systemContent += `RUTINA ACTUAL: ${JSON.stringify(contextoRutina)}\n\n`;
  }

  // Construir historial en formato OpenAI messages
  const messages = [{ role: 'system', content: systemContent }];

  for (const h of historial.slice(-6)) {
    messages.push({
      role: h.remitente === 'usuario' ? 'user' : 'assistant',
      content: h.texto
    });
  }
  messages.push({ role: 'user', content: mensaje });

  try {
    const respuesta = await mercuryChat(messages, { temperature: 0.85, maxTokens: 900 });
    return {
      exito: true,
      coach: coach.nombre,
      respuesta: respuesta.trim()
    };
  } catch (error) {
    console.error('[ERROR COACH_CHAT Mercury]:', error.message);
    return {
      exito: false,
      coach: coach.nombre,
      respuesta: `(${coach.nombre} está tomando un respiro o tomando agua. ¡Inténtale en un momento, compa!)`
    };
  }
}
