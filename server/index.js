import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { generarRutinaEntrenamiento } from './services/routineCoach.service.js';
import { COACHES, chatearConCoach } from './services/coachChat.service.js';
import { sendBookingNotification, sendAttendanceNotification } from './services/email.service.js';
import { AI_STATUS } from './services/aiProvider.service.js';
import { authAndQuotaGuard } from './middleware/auth.middleware.js';
import { registrarAsistenciaEdge } from './services/quota.service.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, 'edge_gym.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    plan_nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    periodo TEXT NOT NULL,
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'Activa',
    beneficios TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

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

app.get('/api/ai/status', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    aiTracker: AI_STATUS
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

// ══════════════════════════════════════════════════════════════════════════════
//  MEMBERSHIPS API — Persistencia en base de datos cloud
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/membership', (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ error: 'Email requerido' });
    const mem = db.prepare(`
      SELECT * FROM memberships 
      WHERE user_email = ? 
      ORDER BY datetime(updated_at) DESC 
      LIMIT 1
    `).get(email);

    if (!mem) return res.status(404).json({ error: 'No se encontró membresía' });

    res.json({
      id: mem.id,
      nombrePlan: mem.plan_nombre,
      precio: mem.precio,
      periodo: mem.periodo,
      fechaInicio: mem.fecha_inicio,
      fechaFin: mem.fecha_fin,
      estado: mem.estado,
      beneficios: JSON.parse(mem.beneficios || '[]')
    });
  } catch (err) {
    console.error('Error al consultar membresía:', err);
    res.status(500).json({ error: 'Error al consultar membresía' });
  }
});

app.post('/api/membership', (req, res) => {
  try {
    const { email, id, nombrePlan, precio, periodo, fechaInicio, fechaFin, estado, beneficios } = req.body;
    if (!email || !nombrePlan) {
      return res.status(400).json({ error: 'Datos de membresía incompletos' });
    }
    const memId = id || `MEM-${Math.floor(100000 + Math.random() * 900000)}`;
    const beneficiosJson = JSON.stringify(beneficios || []);

    const stmt = db.prepare(`
      INSERT INTO memberships (id, user_email, plan_nombre, precio, periodo, fecha_inicio, fecha_fin, estado, beneficios, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        plan_nombre = excluded.plan_nombre,
        precio = excluded.precio,
        periodo = excluded.periodo,
        fecha_inicio = excluded.fecha_inicio,
        fecha_fin = excluded.fecha_fin,
        estado = excluded.estado,
        beneficios = excluded.beneficios,
        updated_at = datetime('now')
    `);

    stmt.run(memId, email, nombrePlan, precio, periodo, fechaInicio, fechaFin, estado || 'Activa', beneficiosJson);

    res.json({ ok: true, mensaje: 'Membresía guardada en la base de datos cloud', id: memId });
  } catch (err) {
    console.error('Error al guardar membresía:', err);
    res.status(500).json({ error: 'Error al registrar membresía' });
  }
});

app.post('/api/membership/renew', (req, res) => {
  try {
    const { id, fechaFin, estado } = req.body;
    if (!id || !fechaFin) return res.status(400).json({ error: 'ID y fecha de fin requeridos' });

    db.prepare(`
      UPDATE memberships 
      SET fecha_fin = ?, estado = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(fechaFin, estado || 'Activa', id);

    res.json({ ok: true, mensaje: 'Membresía renovada en la base de datos cloud' });
  } catch (err) {
    console.error('Error al renovar membresía:', err);
    res.status(500).json({ error: 'Error al renovar membresía' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Edge corriendo en http://localhost:${PORT}`);
});
