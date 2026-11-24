import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import './services/db.js';
import { generarRutinaEntrenamiento } from './services/routineCoach.service.js';
import { COACHES, chatearConCoach } from './services/coachChat.service.js';
import {
  VOICE_PROFILES,
  crearVozPersonalizadaCoach,
  sintetizarVozCoach,
} from './services/coachVoice.service.js';
import { sendBookingNotification, sendAttendanceNotification } from './services/email.service.js';
import { AI_STATUS } from './services/aiProvider.service.js';
import {
  verificarMembresiaBackend,
  hasActiveMembership,
  requireRole,
} from './middleware/auth.middleware.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createStripeRouter } from './routes/stripe.routes.js';
import { createMembershipRouter } from './routes/membership.routes.js';
import { createQrRouter } from './routes/qr.routes.js';
import { createProfileRouter } from './routes/profile.routes.js';
import { createTrainingRouter } from './routes/training.routes.js';
import { createProductsRouter } from './routes/products.routes.js';

const __filename = fileURLToPath(import.meta.url);

export function createApp({
  getStripe,
  verifyGoogleToken,
  fetchImpl,
  enableRateLimit = process.env.NODE_ENV !== 'test',
} = {}) {
  const app = express();

  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Email'],
    }),
  );
  app.use(express.json({ limit: '10mb' }));

  if (enableRateLimit) {
    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      message: { error: 'Demasiadas solicitudes, intente más tarde.' },
    });
    app.use(limiter);
  }

  const limiterIA = enableRateLimit
    ? rateLimit({
        windowMs: 60 * 1000,
        max: 20,
        message: { exito: false, error: 'Protección de cuota activa: por favor espera unos segundos.' },
      })
    : (_req, _res, next) => next();

  app.get('/', (_req, res) => {
    res.json({ status: 'ok', mensaje: 'API espacioGYM Backend unificado en línea' });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      servicio: 'espacioGYM Backend Server',
      geminiConfigured: !!(process.env.GEMINI_LLAVE || process.env.GEMINI_API_KEY),
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/ai/status', (_req, res) => {
    res.json({
      timestamp: new Date().toISOString(),
      aiTracker: AI_STATUS,
    });
  });

  app.get('/api/coaches', (_req, res) => {
    const lista = Object.values(COACHES).map(({ id, nombre, titulo, emoji, frase }) => ({
      id,
      nombre,
      titulo,
      emoji,
      frase,
      hasVoice: Boolean(VOICE_PROFILES[id]),
      voiceStyle: VOICE_PROFILES[id]?.style || '',
    }));
    res.json(lista);
  });

  app.post('/api/coach/chat', limiterIA, verificarMembresiaBackend, async (req, res) => {
    try {
      const { coachId, mensaje, historial, contextoRutina, perfilUsuario, incluirVoz } =
        req.body || {};
      if (!mensaje || !String(mensaje).trim()) {
        return res.status(400).json({ error: 'Mensaje requerido' });
      }
      const membresiaResumen = req.activeMembership || hasActiveMembership(req.user?.email);
      const respuesta = await chatearConCoach({
        coachId,
        mensaje: String(mensaje),
        historial,
        contextoRutina,
        perfilUsuario,
        membresiaResumen,
      });
      if (incluirVoz === true && respuesta?.exito && respuesta.respuesta) {
        const voz = await sintetizarVozCoach({
          coachId: coachId || 'temach',
          texto: respuesta.respuesta,
          fetchImpl,
        });
        if (voz.exito && voz.audioBase64) {
          respuesta.audioBase64 = voz.audioBase64;
          respuesta.mimeType = voz.mimeType;
          respuesta.audioOrigen = voz.origen;
        }
      }
      return res.json(respuesta);
    } catch (err) {
      console.error('Error en /api/coach/chat:', err);
      return res.status(500).json({ error: 'Error procesando el chat.' });
    }
  });

  app.post('/api/coach/tts', limiterIA, verificarMembresiaBackend, async (req, res) => {
    try {
      const { coachId, texto } = req.body || {};
      if (!texto || !String(texto).trim()) {
        return res.status(400).json({ exito: false, error: 'Texto requerido para sintetizar voz.' });
      }
      const resultado = await sintetizarVozCoach({
        coachId: String(coachId || 'temach'),
        texto: String(texto),
        fetchImpl,
      });
      return res.json(resultado);
    } catch (err) {
      console.error('Error en /api/coach/tts:', err);
      return res.status(502).json({ exito: false, error: 'Error sintetizando la voz del coach.' });
    }
  });

  app.post(
    '/api/coach/voices/clone',
    limiterIA,
    verificarMembresiaBackend,
    requireRole('trainer'),
    async (req, res) => {
      try {
        const {
          coachId,
          mode,
          sourceAudioBase64,
          consentAudioBase64,
          mimeType,
          customPrompt,
          store,
        } = req.body || {};
        const resultado = await crearVozPersonalizadaCoach({
          coachId,
          mode,
          sourceAudioBase64,
          consentAudioBase64,
          mimeType,
          customPrompt,
          store,
          fetchImpl,
        });
        return res.status(resultado.exito ? 200 : 400).json(resultado);
      } catch (err) {
        console.error('Error en /api/coach/voices/clone:', err);
        return res.status(500).json({ exito: false, error: 'Error registrando voz personalizada.' });
      }
    },
  );

  app.post('/api/rutina', limiterIA, verificarMembresiaBackend, async (req, res) => {
    try {
      const perfil = req.body || {};
      const resultado = await generarRutinaEntrenamiento(perfil);
      return res.json(resultado);
    } catch (err) {
      console.error('Error en /api/rutina:', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  });

  app.post(['/enviar-correo', '/api/enviar-correo'], async (req, res) => {
    const { correo, nombre, entrenamiento, fecha, turno } = req.body || {};
    if (!correo || !nombre || !entrenamiento || !fecha || !turno) {
      return res.status(400).json({ error: 'Faltan datos requeridos (correo, nombre, entrenamiento, fecha, turno)' });
    }
    try {
      const resultado = await sendBookingNotification({ correo, nombre, entrenamiento, fecha, turno });
      return res.json({ mensaje: 'Correo enviado', resultado });
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      return res.status(500).json({ error: 'Error al enviar el correo' });
    }
  });

  app.post(['/enviar-asistencia', '/api/enviar-asistencia'], async (req, res) => {
    const { correo, nombre, clase, fecha, hora } = req.body || {};
    if (!correo || !nombre || !clase || !fecha || !hora) {
      return res.status(400).json({ mensaje: 'Faltan campos requeridos.' });
    }
    try {
      const resultado = await sendAttendanceNotification({ correo, nombre, clase, fecha, hora });
      return res.status(200).json({ mensaje: 'Correo enviado', resultado });
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      return res.status(500).json({ mensaje: 'Error al enviar el correo.' });
    }
  });

  app.use(createAuthRouter({ verifyGoogleToken }));
  app.use(createStripeRouter({ getStripe }));
  app.use(createMembershipRouter());
  app.use(createQrRouter());
  app.use(createProfileRouter());
  app.use(createTrainingRouter());
  app.use(createProductsRouter());

  return app;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain && process.env.DISABLE_LISTEN !== '1') {
  const PORT = process.env.PORT || 3000;
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor espacioGYM corriendo en http://localhost:${PORT}`);
  });
}

export default createApp;
