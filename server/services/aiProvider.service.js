// ══════════════════════════════════════════════════════════════════════════════
//  GESTOR RESILIENTE DE PROVEEDORES DE IA (MERCURY + GEMINI FALLBACK & TRACKER)
// ══════════════════════════════════════════════════════════════════════════════

const MERCURY_BASE_URL = process.env.MERCURY_BASE_URL || 'https://api.inceptionlabs.ai/v1';

// Modelos oficiales y soportados por la API de Google Gemini
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

/**
 * Estado en memoria del sistema de IA (Tracker)
 */
export const AI_STATUS = {
  mercury: {
    nombre: 'Mercury (Inception Labs)',
    estado: 'desconocido', // 'activo', 'fallo', 'cooldown'
    ultimoExito: null,
    ultimoFallo: null,
    ultimoError: null,
    intentosFallidos: 0,
    cooldownHasta: 0
  },
  gemini: {
    nombre: 'Google Gemini',
    estado: 'desconocido',
    ultimoExito: null,
    ultimoFallo: null,
    ultimoError: null,
    intentosFallidos: 0,
    cooldownHasta: 0
  },
  proveedorActivo: 'ninguno',
  totalPeticiones: 0
};

/**
 * Llama a la API de Mercury
 */
async function callMercury(messages, { temperature = 0.7, maxTokens = 1200, responseFormat = null } = {}) {
  const apiKey = process.env.MERCURY_API_KEY;
  if (!apiKey) throw new Error('MERCURY_API_KEY no configurada');

  const model = process.env.MERCURY_MODEL || 'mercury-2';
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  };

  if (responseFormat) {
    body.response_format = responseFormat;
  }

  const resp = await fetch(`${MERCURY_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errText = await resp.text();
    let msg = `HTTP ${resp.status}`;
    try {
      const parsed = JSON.parse(errText);
      msg = parsed.error?.message || errText;
    } catch {
      msg = errText;
    }
    throw new Error(`Mercury (${resp.status}): ${msg}`);
  }

  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('Mercury devolvió respuesta vacía');
  return text;
}

/**
 * Llama a la API de Gemini (Google) usando modelos vigentes
 */
async function callGemini(messages, { temperature = 0.7, maxTokens = 2000, jsonMode = false } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');

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
      ...(jsonMode ? { responseMimeType: 'application/json' } : {})
    }
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const errText = await resp.text();
        let msg = `HTTP ${resp.status}`;
        try {
          const parsed = JSON.parse(errText);
          msg = parsed.error?.message || errText;
        } catch {
          msg = errText;
        }
        lastError = new Error(`Gemini (${model}): ${msg}`);
        continue;
      }

      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Todos los modelos de Gemini fallaron');
}

/**
 * Despachador principal con conmutación por error (Failover) y memoria de estado
 */
export async function executeAiQuery(messages, opts = {}) {
  AI_STATUS.totalPeticiones++;
  const ahora = Date.now();

  const mercuryKey = process.env.MERCURY_API_KEY;
  const mercuryEnCooldown = ahora < AI_STATUS.mercury.cooldownHasta;

  // 1. Intentar Mercury si está configurado y no está en cooldown
  if (mercuryKey && !mercuryEnCooldown) {
    try {
      const text = await callMercury(messages, opts);
      AI_STATUS.mercury.estado = 'activo';
      AI_STATUS.mercury.ultimoExito = new Date().toISOString();
      AI_STATUS.mercury.intentosFallidos = 0;
      AI_STATUS.proveedorActivo = 'Mercury';
      return { text, origen: 'Mercury' };
    } catch (err) {
      AI_STATUS.mercury.estado = 'fallo';
      AI_STATUS.mercury.ultimoFallo = new Date().toISOString();
      AI_STATUS.mercury.ultimoError = err.message;
      AI_STATUS.mercury.intentosFallidos++;
      
      // Si fue error de autenticación (clave inválida), aplicar cooldown de 5 minutos
      if (err.message.includes('401') || err.message.includes('invalid_api_key')) {
        AI_STATUS.mercury.cooldownHasta = ahora + 5 * 60 * 1000;
        AI_STATUS.mercury.estado = 'cooldown';
      }

      console.warn(`⚠️ [AI TRACKER] Falló Mercury (${err.message}). Activando respaldo con Gemini...`);
    }
  }

  // 2. Fallback a Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiEnCooldown = ahora < AI_STATUS.gemini.cooldownHasta;

  if (geminiKey && !geminiEnCooldown) {
    try {
      const text = await callGemini(messages, opts);
      AI_STATUS.gemini.estado = 'activo';
      AI_STATUS.gemini.ultimoExito = new Date().toISOString();
      AI_STATUS.gemini.intentosFallidos = 0;
      AI_STATUS.proveedorActivo = 'Gemini';
      return { text, origen: 'Gemini' };
    } catch (err) {
      AI_STATUS.gemini.estado = 'fallo';
      AI_STATUS.gemini.ultimoFallo = new Date().toISOString();
      AI_STATUS.gemini.ultimoError = err.message;
      AI_STATUS.gemini.intentosFallidos++;

      if (err.message.includes('403') || err.message.includes('leaked')) {
        AI_STATUS.gemini.cooldownHasta = ahora + 10 * 60 * 1000;
        AI_STATUS.gemini.estado = 'cooldown';
      }

      console.error(`❌ [AI TRACKER] Falló Gemini (${err.message}).`);
      throw err;
    }
  }

  throw new Error(
    `No hay proveedores de IA disponibles. Mercury: ${AI_STATUS.mercury.ultimoError || 'Sin clave'}. Gemini: ${AI_STATUS.gemini.ultimoError || 'Sin clave'}.`
  );
}
