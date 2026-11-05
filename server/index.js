import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { generarRutinaEntrenamiento } from './services/routineCoach.service.js';
import { COACHES, chatearConCoach } from './services/coachChat.service.js';
import { sendBookingNotification, sendAttendanceNotification } from './services/email.service.js';
import { authAndQuotaGuard } from './middleware/auth.middleware.js';
import { registrarAsistenciaEdge } from './services/quota.service.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración CORS permisiva para GitHub Pages y desarrollo local
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Rate limiter general
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Demasiadas solicitudes, intente más tarde.' }
});
app.use(limiter);

// Endpoint de comprobación de estado (Healthcheck)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    dispositivo: 'ZTE K92 Edge Server (FTM mode)',
    timestamp: new Date().toISOString()
  });
});

// Endpoint de Asistencia Offline en el Borde (Torniquete / QR)
app.post('/api/edge/asistencia', (req, res) => {
  const { uid, codigoQr } = req.body;
  if (!uid) return res.status(400).json({ error: 'UID requerido' });

  registrarAsistenciaEdge(uid, codigoQr);
  res.json({ exito: true, mensaje: 'Asistencia registrada en el nodo Edge local' });
});

// Lista de Coaches disponibles (público)
app.get('/api/coaches', (req, res) => {
  const lista = Object.values(COACHES).map(({ id, nombre, titulo, emoji, frase }) => ({
    id, nombre, titulo, emoji, frase
  }));
  res.json(lista);
});

// Endpoint de Chat con un Coach (Protegido con Google Auth + Cuotas SQLite)
app.post('/api/coach/chat', authAndQuotaGuard, async (req, res) => {
  try {
    const { coachId, mensaje, historial, contextoRutina, perfilUsuario } = req.body;
    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }
    const respuesta = await chatearConCoach({ coachId, mensaje, historial, contextoRutina, perfilUsuario });
    res.json({ ...respuesta, cuotaRestante: req.cuotaRestante });
  } catch (err) {
    console.error('Error en /api/coach/chat:', err);
    res.status(500).json({ error: 'Error procesando el chat.' });
  }
});

// Ruta para generar rutina con Gemini (Protegido con Google Auth + Cuotas SQLite)
app.post('/api/rutina', authAndQuotaGuard, async (req, res) => {
  try {
    const perfil = req.body;
    const resultado = await generarRutinaEntrenamiento(perfil);
    res.json({ ...resultado, cuotaRestante: req.cuotaRestante });
  } catch (err) {
    console.error('Error en /api/rutina:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Endpoint para enviar confirmación de correo al agendar entrenamiento
app.post('/enviar-correo', async (req, res) => {
  const { correo, nombre, entrenamiento, fecha, turno } = req.body;

  if (!correo || !nombre || !entrenamiento || !fecha || !turno) {
    return res.status(400).json({ error: 'Faltan datos requeridos (correo, nombre, entrenamiento, fecha, turno)' });
  }

  try {
    const resultado = await sendBookingNotification({ correo, nombre, entrenamiento, fecha, turno });
    res.json({ mensaje: 'Correo enviado', resultado });
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    res.status(500).json({ error: 'Error al enviar el correo' });
  }
});

// Endpoint para enviar confirmación de asistencia por correo
app.post('/enviar-asistencia', async (req, res) => {
  const { correo, nombre, clase, fecha, hora } = req.body;

  if (!correo || !nombre || !clase || !fecha || !hora) {
    return res.status(400).json({ mensaje: 'Faltan campos requeridos.' });
  }

  try {
    const resultado = await sendAttendanceNotification({ correo, nombre, clase, fecha, hora });
    res.status(200).json({ mensaje: 'Correo enviado', resultado });
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    res.status(500).json({ mensaje: 'Error al enviar el correo.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Edge corriendo en http://localhost:${PORT}`);
});
