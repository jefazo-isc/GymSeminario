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

// Crear tabla de reservas de clases en SQLite
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    usuario TEXT,
    email TEXT,
    nombre TEXT,
    entrenamiento TEXT NOT NULL,
    fecha TEXT NOT NULL,
    turno TEXT NOT NULL,
    telefono TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Crear tabla de asistencias físicas registradas
db.exec(`
  CREATE TABLE IF NOT EXISTS attendances (
    id TEXT PRIMARY KEY,
    usuario TEXT,
    email TEXT,
    nombre TEXT,
    clase TEXT NOT NULL,
    fecha TEXT NOT NULL,
    hora TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Semilla inicial si no hay reservas (para mantener los 4 registros históricos de Boxeo)
try {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM bookings').get();
  if (!countRow || countRow.count === 0) {
    const seed = db.prepare(`
      INSERT INTO bookings (id, usuario, email, nombre, entrenamiento, fecha, turno)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    seed.run('seed-box-1', '1', 'socio1@espaciogym.mx', 'Socio Box 1', 'Boxeo', '2026-11-01', 'Matutino');
    seed.run('seed-box-2', '2', 'socio2@espaciogym.mx', 'Socio Box 2', 'Boxeo', '2026-11-02', 'Vespertino');
    seed.run('seed-box-3', '3', 'socio3@espaciogym.mx', 'Socio Box 3', 'Boxeo', '2026-11-03', 'Matutino');
    seed.run('seed-box-4', '4', 'socio4@espaciogym.mx', 'Socio Box 4', 'Boxeo', '2026-11-04', 'Vespertino');
  }
} catch (e) {
  console.warn('Advertencia al verificar semilla de bookings:', e.message);
}

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
    servicio: 'espacioGYM Backend Server',
    geminiConfigured: !!(process.env.GEMINI_LLAVE || process.env.GEMINI_API_KEY),
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

// Endpoint de Chat con un Coach
app.post('/api/coach/chat', async (req, res) => {
  try {
    const { coachId, mensaje, historial, contextoRutina, perfilUsuario } = req.body;
    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }
    const respuesta = await chatearConCoach({ coachId, mensaje, historial, contextoRutina, perfilUsuario });
    res.json(respuesta);
  } catch (err) {
    console.error('Error en /api/coach/chat:', err);
    res.status(500).json({ error: 'Error procesando el chat.' });
  }
});

// Ruta para generar rutina
app.post('/api/rutina', async (req, res) => {
  try {
    const perfil = req.body;
    const resultado = await generarRutinaEntrenamiento(perfil);
    res.json(resultado);
  } catch (err) {
    console.error('Error en /api/rutina:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Endpoint para enviar confirmación de correo al agendar entrenamiento (compatible con y sin prefijo /api)
app.post(['/enviar-correo', '/api/enviar-correo'], async (req, res) => {
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

// Endpoint para enviar confirmación de asistencia por correo (compatible con y sin prefijo /api)
app.post(['/enviar-asistencia', '/api/enviar-asistencia'], async (req, res) => {
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
//  ENDPOINTS DE RESERVAS, ASISTENCIAS Y ESTADÍSTICAS (SQLITE CENTRALIZADO)
// ══════════════════════════════════════════════════════════════════════════════

// Crear nueva reserva en SQLite
app.post(['/api/bookings', '/bookings'], (req, res) => {
  try {
    const { id, entrenamiento, fecha, turno, usuario, email, nombre, telefono } = req.body;
    if (!entrenamiento || !fecha || !turno) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: entrenamiento, fecha, turno' });
    }
    const bookingId = id || `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    db.prepare(`
      INSERT INTO bookings (id, usuario, email, nombre, entrenamiento, fecha, turno, telefono)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bookingId,
      usuario ? String(usuario) : null,
      email || null,
      nombre || null,
      entrenamiento.trim(),
      fecha.trim(),
      turno.trim(),
      telefono || null
    );
    res.status(201).json({ id: bookingId, mensaje: 'Reserva registrada exitosamente en SQLite' });
  } catch (err) {
    console.error('Error al registrar reserva:', err);
    res.status(500).json({ error: 'Error al registrar la reserva en base de datos' });
  }
});

// Listar todas las reservas registradas
app.get(['/api/bookings', '/bookings'], (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (err) {
    console.error('Error al listar reservas:', err);
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
});

// Registrar asistencia física en SQLite
app.post(['/api/attendances', '/attendances'], (req, res) => {
  try {
    const { id, clase, fecha, hora, usuario, email, nombre } = req.body;
    if (!clase || !fecha || !hora) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: clase, fecha, hora' });
    }
    const attId = id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    db.prepare(`
      INSERT INTO attendances (id, usuario, email, nombre, clase, fecha, hora)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      attId,
      usuario ? String(usuario) : null,
      email || null,
      nombre || null,
      clase.trim(),
      fecha.trim(),
      hora.trim()
    );
    res.status(201).json({ id: attId, mensaje: 'Asistencia registrada exitosamente en SQLite' });
  } catch (err) {
    console.error('Error al registrar asistencia:', err);
    res.status(500).json({ error: 'Error al registrar asistencia' });
  }
});

// Listar asistencias registradas
app.get(['/api/attendances', '/attendances'], (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM attendances ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (err) {
    console.error('Error al listar asistencias:', err);
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
});

// Estadísticas en tiempo real calculadas directamente de SQLite
app.get(['/api/sessions/stats', '/sessions/stats'], (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT entrenamiento, COUNT(*) as total
      FROM bookings
      GROUP BY entrenamiento
    `).all();

    const stats = {
      Boxeo: 0,
      Crossfit: 0,
      Spinning: 0,
      Yoga: 0,
      Pesas: 0
    };

    for (const row of rows) {
      const match = Object.keys(stats).find(
        k => k.toLowerCase() === (row.entrenamiento || '').toLowerCase()
      );
      if (match) {
        stats[match] = row.total;
      } else if (row.entrenamiento) {
        stats[row.entrenamiento] = row.total;
      }
    }

    res.json(stats);
  } catch (err) {
    console.error('Error al calcular estadísticas en /api/sessions/stats:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas del servidor' });
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
