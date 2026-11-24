import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
const CHATTERBOX_SPACES = [
  { baseUrl: 'https://resembleai-chatterbox-multilingual-tts-v3.hf.space', isV3: true },
  { baseUrl: 'https://resembleai-chatterbox-multilingual-tts.hf.space', isV3: false },
];
const UPLOAD_TTL_MS = 10 * 60 * 1000;
const MAX_AUDIO_CACHE = 40;

export const VOICE_PROFILES = {
  torso: {
    envVar: 'COACH_VOICE_ID_TORSO',
    prebuiltVoice: 'Orus',
    gender: 'male',
    languageCode: 'es-US',
    exaggeration: 0.45,
    designPrompt:
      'Hombre latinoamericano de 34 años con voz masculina natural, clara, firme y equilibrada de entrenador físico profesional.',
    style: 'claro, técnico, sereno y motivador de forma natural',
  },
  pierna: {
    envVar: 'COACH_VOICE_ID_PIERNA',
    prebuiltVoice: 'Laomedeia',
    gender: 'female',
    languageCode: 'es-US',
    exaggeration: 0.48,
    designPrompt:
      'Mujer latinoamericana de 30 años con voz femenina natural, cálida, cercana y atlética de entrenadora personal.',
    style: 'cercano, seguro, natural y alentador',
  },
  core: {
    envVar: 'COACH_VOICE_ID_CORE',
    prebuiltVoice: 'Algenib',
    gender: 'male',
    languageCode: 'es-US',
    exaggeration: 0.45,
    designPrompt:
      'Hombre latinoamericano de 29 años con voz masculina natural, amigable, articulada y tranquila de especialista en acondicionamiento.',
    style: 'estructurado, natural, amigable y enfocado',
  },
};

const audioCache = new Map();
const customVoiceIds = new Map();
const chatterboxUploadCache = new Map();

function normalizeCoachId(coachId) {
  const clean = String(coachId || 'torso').toLowerCase().trim();
  return Object.hasOwn(VOICE_PROFILES, clean) ? clean : 'torso';
}

export function getVoiceProfile(coachId) {
  return VOICE_PROFILES[normalizeCoachId(coachId)];
}

export function resolveVoiceIdentifier(coachId) {
  const key = normalizeCoachId(coachId);
  const profile = VOICE_PROFILES[key];
  const runtimeId = customVoiceIds.get(key);
  if (runtimeId) return runtimeId;
  const envId = (process.env[profile.envVar] || '').trim();
  if (envId) return envId;
  return profile.prebuiltVoice;
}

/**
 * Normaliza respuestas Markdown del chat para lectura natural y baja latencia.
 */
export function limpiarTextoParaVoz(texto, maxChars = 260) {
  if (!texto) return '';
  let clean = String(texto)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^\|.*\|$/gm, ' ')
    .replace(/^[\s\-:|]+$/gm, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= maxChars) return clean;

  const sliced = clean.slice(0, maxChars);
  const lastSentenceEnd = Math.max(
    sliced.lastIndexOf('.'),
    sliced.lastIndexOf('!'),
    sliced.lastIndexOf('?'),
  );
  if (lastSentenceEnd > maxChars * 0.45) {
    return sliced.slice(0, lastSentenceEnd + 1).trim();
  }
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim() + '.';
}

function getCachedAudio(cacheKey) {
  const hit = audioCache.get(cacheKey);
  if (!hit) return null;
  audioCache.delete(cacheKey);
  audioCache.set(cacheKey, hit);
  return hit;
}

function setCachedAudio(cacheKey, entry) {
  if (audioCache.has(cacheKey)) {
    audioCache.delete(cacheKey);
  } else if (audioCache.size >= MAX_AUDIO_CACHE) {
    const oldestKey = audioCache.keys().next().value;
    if (oldestKey) audioCache.delete(oldestKey);
  }
  audioCache.set(cacheKey, entry);
}

export function clearCoachVoiceCache() {
  audioCache.clear();
  customVoiceIds.clear();
  chatterboxUploadCache.clear();
}

function readCoachReferenceAudio(coachId) {
  const candidates = [
    path.resolve(__dirname, '../assets/coaches', `${coachId}.mp3`),
    path.resolve(__dirname, '../../public/audio/coaches', `${coachId}.mp3`),
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
      }
    } catch {
      // Continuar con siguiente candidato
    }
  }
  return null;
}

function parseGradioSseOutput(sseText, baseUrl) {
  const lines = String(sseText || '').split('\n');
  let isErrorEvent = false;
  let resolvedUrl = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('event:')) {
      const ev = line.slice(6).trim();
      if (ev === 'error') {
        isErrorEvent = true;
      } else {
        isErrorEvent = false;
      }
      continue;
    }
    if (line.startsWith('data:')) {
      const payload = line.slice(5).trim();
      if (isErrorEvent) {
        throw new Error(`Chatterbox SSE error: ${payload}`);
      }
      if (!payload || payload === 'null') continue;
      try {
        const parsed = JSON.parse(payload);
        if (Array.isArray(parsed) && parsed[0]) {
          const item = parsed[0];
          resolvedUrl =
            item.url || (item.path ? `${baseUrl}/gradio_api/file=${item.path}` : null);
        }
      } catch {
        // Ignorar líneas parciales no JSON
      }
    }
  }

  return resolvedUrl;
}

async function callChatterboxZeroShot({ coachId, texto, exaggeration = 0.58, fetchImpl = fetch }) {
  const refBuffer = readCoachReferenceAudio(coachId);
  if (!refBuffer) {
    throw new Error(`Audio de referencia no encontrado para ${coachId}`);
  }

  let lastError = null;
  for (const { baseUrl, isV3 } of CHATTERBOX_SPACES) {
    const uploadKey = `${baseUrl}:${coachId}`;
    try {
      let remotePath = null;
      const cachedUpload = chatterboxUploadCache.get(uploadKey);
      if (cachedUpload && cachedUpload.expiresAt > Date.now()) {
        remotePath = cachedUpload.path;
      } else {
        const formData = new FormData();
        formData.append('files', new Blob([refBuffer], { type: 'audio/mpeg' }), `${coachId}.mp3`);
        const upResp = await fetchImpl(`${baseUrl}/gradio_api/upload`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(10000),
        });
        if (!upResp.ok) {
          throw new Error(`Chatterbox upload HTTP ${upResp.status}`);
        }
        const upJson = await upResp.json();
        remotePath = Array.isArray(upJson) ? upJson[0] : null;
        if (!remotePath) {
          throw new Error('Chatterbox upload no devolvió ruta remota');
        }
        chatterboxUploadCache.set(uploadKey, {
          path: remotePath,
          expiresAt: Date.now() + UPLOAD_TTL_MS,
        });
      }

      const fileObj = { path: remotePath, meta: { _type: 'gradio.FileData' } };
      const data = isV3
        ? [texto, fileObj, 'es', exaggeration, 0.75, 0, 0.5]
        : [texto, 'es', fileObj, exaggeration, 0.75, 0, 0.5];

      const callResp = await fetchImpl(`${baseUrl}/gradio_api/call/generate_tts_audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
        signal: AbortSignal.timeout(10000),
      });
      if (!callResp.ok) {
        chatterboxUploadCache.delete(uploadKey);
        throw new Error(`Chatterbox call HTTP ${callResp.status}`);
      }
      const { event_id: eventId } = await callResp.json();
      if (!eventId) {
        throw new Error('Chatterbox no devolvió event_id');
      }

      const sseResp = await fetchImpl(`${baseUrl}/gradio_api/call/generate_tts_audio/${eventId}`, {
        signal: AbortSignal.timeout(22000),
      });
      if (!sseResp.ok) {
        chatterboxUploadCache.delete(uploadKey);
        throw new Error(`Chatterbox SSE HTTP ${sseResp.status}`);
      }
      const sseText = await sseResp.text();
      const wavUrl = parseGradioSseOutput(sseText, baseUrl);
      if (!wavUrl) {
        throw new Error('Chatterbox no generó URL de audio');
      }

      const wavResp = await fetchImpl(wavUrl, {
        signal: AbortSignal.timeout(10000),
      });
      if (!wavResp.ok) {
        throw new Error(`Chatterbox WAV download HTTP ${wavResp.status}`);
      }
      const wavBuffer = Buffer.from(await wavResp.arrayBuffer());
      if (!wavBuffer.length) {
        throw new Error('Chatterbox devolvió WAV vacío');
      }

      return {
        data: wavBuffer.toString('base64'),
        mimeType: 'audio/wav',
        voiceUsed: `chatterbox-${coachId}`,
      };
    } catch (err) {
      chatterboxUploadCache.delete(uploadKey);
      lastError = err;
    }
  }

  throw lastError || new Error('Todos los nodos Chatterbox fallaron');
}

function extractAudioFromInteraction(data) {
  if (data?.output_audio?.data) {
    return {
      data: data.output_audio.data,
      mimeType: data.output_audio.mime_type || 'audio/wav',
    };
  }
  const steps = Array.isArray(data?.steps) ? data.steps : [];
  let found = null;
  for (const step of steps) {
    if (step?.type !== 'model_output' || !Array.isArray(step.content)) continue;
    for (const part of step.content) {
      if (part?.type === 'audio' && typeof part.data === 'string' && part.data.length > 0) {
        found = {
          data: part.data,
          mimeType: part.mime_type || 'audio/wav',
        };
      }
    }
  }
  return found;
}

async function callGeminiTtsInteraction({ apiKey, model, texto, voice, style, fetchImpl }) {
  const resp = await fetchImpl(`${GEMINI_API_BASE}/interactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        {
          type: 'user_input',
          content: [
            {
              type: 'text',
              text: texto,
              annotations: [
                {
                  type: 'speech_metadata',
                  style,
                },
              ],
            },
          ],
        },
      ],
      response_format: {
        type: 'audio',
        mime_type: 'audio/wav',
      },
      generation_config: {
        speech_config: [{ voice }],
      },
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    let msg = `HTTP ${resp.status}`;
    try {
      const parsed = JSON.parse(errText);
      msg = parsed.error?.message || msg;
    } catch {
      if (errText) msg = errText;
    }
    const err = new Error(`Gemini TTS (${model}): ${msg}`);
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();
  const audio = extractAudioFromInteraction(data);
  if (!audio?.data) {
    throw new Error(`Gemini TTS (${model}) no devolvió datos de audio.`);
  }
  return audio;
}

/**
 * Crea o registra una voz personalizada (clonada desde audio o diseñada por prompt) en Gemini Voices API.
 */
export async function crearVozPersonalizadaCoach({
  coachId,
  mode = 'prompted',
  sourceAudioBase64,
  consentAudioBase64,
  mimeType = 'audio/wav',
  customPrompt,
  store = true,
  fetchImpl = fetch,
} = {}) {
  const cleanId = String(coachId || '').toLowerCase().trim();
  if (!Object.hasOwn(VOICE_PROFILES, cleanId)) {
    return { exito: false, error: 'Coach no reconocido para configurar voz.' };
  }

  const apiKey = (process.env.GEMINI_LLAVE || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return { exito: false, error: 'GEMINI_API_KEY no configurada en el servidor.' };
  }

  const profile = VOICE_PROFILES[cleanId];
  const isReplicated = mode === 'replicated';

  if (isReplicated && (!sourceAudioBase64 || !consentAudioBase64)) {
    return {
      exito: false,
      error: 'La clonación directa requiere audio de referencia (sourceAudioBase64) y consentimiento (consentAudioBase64).',
    };
  }

  const voicePayload = isReplicated
    ? {
        model: GEMINI_TTS_MODELS[0],
        type: 'replicated',
        display_name: `espacioGYM - ${cleanId}`,
        replicated: {
          source_audio: { mime_type: mimeType, data: sourceAudioBase64 },
          consent_audio: { mime_type: mimeType, data: consentAudioBase64 },
        },
      }
    : {
        model: GEMINI_TTS_MODELS[0],
        type: 'prompted',
        display_name: `espacioGYM - ${cleanId}`,
        gender: profile.gender,
        language_code: profile.languageCode,
        prompted: {
          input: customPrompt ? String(customPrompt).trim() : profile.designPrompt,
        },
      };

  const resp = await fetchImpl(`${GEMINI_API_BASE}/voices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      store: Boolean(store),
      voice: voicePayload,
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    let msg = `HTTP ${resp.status}`;
    try {
      const parsed = JSON.parse(errText);
      msg = parsed.error?.message || msg;
    } catch {
      if (errText) msg = errText;
    }
    return { exito: false, coachId: cleanId, error: `No se pudo registrar la voz en Gemini: ${msg}` };
  }

  const data = await resp.json();
  const voiceId = data.id || data.key;
  if (!voiceId) {
    return { exito: false, coachId: cleanId, error: 'Gemini Voices API no devolvió identificador de voz.' };
  }

  customVoiceIds.set(cleanId, voiceId);
  return {
    exito: true,
    coachId: cleanId,
    voiceId,
    mode: isReplicated ? 'replicated' : 'prompted',
    sampleAudioBase64: data.sample_audio?.data || null,
  };
}

/**
 * Sintetiza audio clonado zero-shot con Chatterbox (primario, gratis sin API key) + fallback Gemini 3.8 TTS.
 */
export async function sintetizarVozCoach({ coachId = 'temach', texto, fetchImpl = fetch } = {}) {
  const normalizedId = normalizeCoachId(coachId);
  const profile = VOICE_PROFILES[normalizedId];
  const textoLimpio = limpiarTextoParaVoz(texto, 260);

  if (!textoLimpio) {
    return { exito: false, coachId: normalizedId, error: 'Texto vacío para sintetizar.' };
  }

  const primaryVoice = resolveVoiceIdentifier(normalizedId);
  const cacheKey = crypto
    .createHash('sha256')
    .update(`${normalizedId}:${primaryVoice}:${textoLimpio}`)
    .digest('hex');

  const cached = getCachedAudio(cacheKey);
  if (cached) {
    return {
      exito: true,
      coachId: normalizedId,
      voiceUsed: cached.voiceUsed,
      origen: 'cache',
      mimeType: cached.mimeType,
      audioBase64: cached.audioBase64,
    };
  }

  let chatterboxError = null;
  if (process.env.DISABLE_CHATTERBOX !== '1') {
    try {
      const cloned = await callChatterboxZeroShot({
        coachId: normalizedId,
        texto: textoLimpio,
        exaggeration: profile.exaggeration ?? 0.58,
        fetchImpl,
      });
      const entry = {
        voiceUsed: cloned.voiceUsed,
        mimeType: cloned.mimeType || 'audio/wav',
        audioBase64: cloned.data,
      };
      setCachedAudio(cacheKey, entry);
      return {
        exito: true,
        coachId: normalizedId,
        voiceUsed: entry.voiceUsed,
        origen: 'chatterbox',
        mimeType: entry.mimeType,
        audioBase64: entry.audioBase64,
      };
    } catch (err) {
      chatterboxError = err;
      console.warn('[COACH VOICE] Chatterbox falló, intentando respaldo Gemini TTS:', err.message);
    }
  }

  const apiKey = (process.env.GEMINI_LLAVE || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return {
      exito: false,
      coachId: normalizedId,
      error: chatterboxError?.message || 'Servicio de voz IA no configurado en el servidor.',
    };
  }

  const voicesToTry =
    primaryVoice !== profile.prebuiltVoice
      ? [primaryVoice, profile.prebuiltVoice]
      : [profile.prebuiltVoice];

  let lastError = null;
  for (const voice of voicesToTry) {
    for (const model of GEMINI_TTS_MODELS) {
      try {
        const audio = await callGeminiTtsInteraction({
          apiKey,
          model,
          texto: textoLimpio,
          voice,
          style: profile.style,
          fetchImpl,
        });
        const entry = {
          voiceUsed: voice,
          mimeType: audio.mimeType || 'audio/wav',
          audioBase64: audio.data,
        };
        setCachedAudio(cacheKey, entry);
        return {
          exito: true,
          coachId: normalizedId,
          voiceUsed: entry.voiceUsed,
          origen: 'gemini-tts',
          mimeType: entry.mimeType,
          audioBase64: entry.audioBase64,
        };
      } catch (err) {
        lastError = err;
        if (voice !== profile.prebuiltVoice && (err.status === 400 || err.status === 404)) {
          break;
        }
      }
    }
  }

  return {
    exito: false,
    coachId: normalizedId,
    error: lastError?.message || chatterboxError?.message || 'No fue posible sintetizar audio.',
  };
}
