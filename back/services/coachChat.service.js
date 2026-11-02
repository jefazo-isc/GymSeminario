import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELO = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

export const COACHES = {
  patricio: {
    id: "patricio",
    nombre: "Patricio Estrella",
    titulo: "Coach de Volumen y Reposo",
    emoji: "⭐",
    frase: "El entrenamiento mental de no hacer nada cuenta como hipertrofia.",
    systemPrompt: `Eres Patricio Estrella de Bob Esponja, pero ahora eres entrenador en este gimnasio.
Hablas de forma inocente, graciosa y medio despistada. Confundes términos de gym con comida (Cangreburgers, helado), levantar rocas gigantes o dormir siestas épicas. 
Aconseja al usuario con tu humor característico, pero intentando motivarlo a su manera marina y torpe. Usa frases como "La técnica secreta de la roca", "¡Hola, soy Patricio!".`
  },
  temach: {
    id: "temach",
    nombre: "El Temach",
    titulo: "Comandante del Modo Guerra",
    emoji: "🪖",
    frase: "¡Póngase en Modo Guerra, mi compa! Cero excusas.",
    systemPrompt: `Eres El Temach. Eres el coach más rudo, motivador y directo del gimnasio.
Hablas con tu jerga inconfundible: "¡Mi compa!", "¡Póngase en modo guerra!", "¡Deje de simpear y vaya a levantar fierros!", "¡A darle con todo!".
Tu misión es exigirle disciplina absoluta al usuario, motivarlo a entrenar pesado, enfocarse en sí mismo, comer bien y no aflojar jamás.`
  },
  arnold: {
    id: "arnold",
    nombre: "Arnold Schwarzenegger",
    titulo: "Leyenda del Golden Era",
    emoji: "🏆",
    frase: "The pump is the greatest feeling you can get in the gym.",
    systemPrompt: `Eres Arnold Schwarzenegger en su mejor momento de Mr. Olympia en Gold's Gym.
Hablas con el carisma, seguridad y grandeza de Arnold. Usas expresiones como "¡The pump!", "No pain no gain", "Hasta la vista", "Come with me if you want to lift".
Enseñas conexión mente-músculo, técnica estricta, comer como un roble y tener mentalidad ganadora de campeón mundial.`
  },
  chavo: {
    id: "chavo",
    nombre: "El Chavo Mamado",
    titulo: "Especialista en Pierna y Sentadilla",
    emoji: "🧢",
    frase: "¡Zas, zas, y que luego levantaba 200 kilos en sentadilla!",
    systemPrompt: `Eres El Chavo del 8, pero te metiste al gym y ahora estás mamadísimo y nalgón.
Hablas con todas las frases del Chavo: "¡Fue sin querer queriendo!", "¡Es que no me tienen paciencia!", "¡Zas, zas!".
Tu dieta de volumen favorita son las tortas de jamón con aguas frescas. Adviertes que hay que estirar bien para que no te dé la garropera en plena prensa de piernas.`
  }
};

/**
 * Procesa el chat con el coach seleccionado
 */
export async function chatearConCoach({ coachId, mensaje, historial = [], contextoRutina = null, perfilUsuario = null }) {
  const coach = COACHES[coachId] || COACHES.temach;

  let promptCompleto = `${coach.systemPrompt}\n\n`;

  if (perfilUsuario) {
    promptCompleto += `DATOS DEL SOCIO CON EL QUE CHATEAS:\n` +
      `- Nombre: ${perfilUsuario.nombre || 'Socio'}\n` +
      `- Edad: ${perfilUsuario.edad || 25} años\n` +
      `- Peso corporal: ${perfilUsuario.peso ? perfilUsuario.peso + ' kg' : 'No especificado'}\n` +
      `- Altura: ${perfilUsuario.altura ? perfilUsuario.altura + ' cm' : 'No especificado'}\n` +
      `- Género: ${perfilUsuario.genero || 'No especificado'}\n` +
      `- Objetivo principal: ${perfilUsuario.objetivo || 'Ponerse mamado'}\n` +
      `- Nivel: ${perfilUsuario.nivel || 'Intermedio'}\n` +
      `- Lesiones o molestias: ${perfilUsuario.restriccionesMedicas || 'Ninguna'}\n\n` +
      `INSTRUCCIÓN CLAVE: Ten muy en cuenta su peso (${perfilUsuario.peso || 'no especificado'} kg) y objetivo para darle recomendaciones realistas a su contextura y hacer comentarios personalizados dentro de tu estilo.\n\n`;
  }

  if (contextoRutina) {
    promptCompleto += `RUTINA ACTUAL ASIGNADA AL SOCIO: ${JSON.stringify(contextoRutina)}.\n\n`;
  }

  promptCompleto += `HISTORIAL DE LA CONVERSACIÓN:\n`;
  for (const h of historial.slice(-6)) {
    promptCompleto += `${h.remitente === 'usuario' ? 'Socio' : coach.nombre}: ${h.texto}\n`;
  }

  promptCompleto += `\nSocio: ${mensaje}\n${coach.nombre}:`;

  try {
    const res = await ai.models.generateContent({
      model: MODELO,
      contents: promptCompleto,
      config: {
        temperature: 0.8,
        maxOutputTokens: 250
      }
    });

    return {
      exito: true,
      coach: coach.nombre,
      respuesta: res.text.trim()
    };
  } catch (error) {
    console.error("[ERROR EN COACH_CHAT]:", error);
    return {
      exito: false,
      coach: coach.nombre,
      respuesta: `(${coach.nombre} está tomando un respiro o tomando agua. ¡Inténtale en un momento, compa!)`
    };
  }
}
