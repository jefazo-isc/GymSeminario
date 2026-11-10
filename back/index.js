import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '366321485374-143tbv091m8a3r6ajps5jsodpj9aeah0.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

import { generarRutinaEntrenamiento } from './services/routineCoach.service.js';
import { COACHES, chatearConCoach } from './services/coachChat.service.js';
import { sendBookingNotification, sendAttendanceNotification } from './services/email.service.js';
import { AI_STATUS } from './services/aiProvider.service.js';

const db = new Database('./gym.db');
const JWT_SECRET = process.env.JWT_SECRET || 'gym-seminario-secret-2026';

// Crear tabla de usuarios (compatible con schema antiguo y nuevo)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '',
    nombre TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    provider TEXT NOT NULL DEFAULT 'email',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Crear tabla de membresías
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

// Migración: agregar columna provider si no existe (para DBs antiguas)
try {
  db.exec(`ALTER TABLE users ADD COLUMN provider TEXT NOT NULL DEFAULT 'email'`);
  console.log('✅ Migración: columna provider agregada');
} catch { /* ya existe, ignorar */ }

// Migración: hacer password opcional (DEFAULT '') si era NOT NULL sin default
try {
  // SQLite no soporta ALTER COLUMN, pero con DEFAULT '' los inserts sin password jalán
  console.log('✅ Schema usuarios listo');
} catch { /* noop */ }

// Crear usuario admin por defecto si no existe
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@gymseminario.com');
if (!adminExists) {
  const hash = bcrypt.hashSync('Admin1234!', 10);
  db.prepare("INSERT INTO users (email, password, nombre, role) VALUES (?, ?, ?, ?)").run('admin@gymseminario.com', hash, 'Administrador', 'admin');
  console.log('✅ Usuario admin creado: admin@gymseminario.com / Admin1234!');
}

// Configurar a Yahir como Administrador y Gerente
const yahirEmail = 'guevara.cardona.yahir@gmail.com';
const yahirUser = db.prepare('SELECT id, role FROM users WHERE email = ?').get(yahirEmail);
if (yahirUser) {
  if (yahirUser.role !== 'admin') {
    db.prepare('UPDATE users SET role = ? WHERE email = ?').run('admin', yahirEmail);
    console.log(`✅ Yahir (${yahirEmail}) actualizado con rol de Administrador/Gerente.`);
  }
} else {
  const hashYahir = bcrypt.hashSync('Admin1234!', 10);
  db.prepare("INSERT INTO users (email, password, nombre, role, provider) VALUES (?, ?, ?, ?, ?)").run(
    yahirEmail,
    hashYahir,
    'Yahir Guevara Cardona',
    'admin',
    'google'
  );
  console.log(`✅ Yahir (${yahirEmail}) creado automáticamente con rol de Administrador/Gerente.`);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Logger visible en Render para monitorear cada solicitud
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Rate limiter general
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Demasiadas solicitudes, intente más tarde.' }
});
app.use(limiter);

// Rate limiter para IA
const limiterIA = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { exito: false, error: 'Protección de cuota activa: por favor espera unos segundos.' }
});

// Endpoint raíz y comprobación de estado
app.get('/', (req, res) => {
  res.json({ status: 'ok', mensaje: 'API GROM Backend + Coach IA en línea 🚀' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    servicio: 'GROM Backend Full',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ai/status', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    aiTracker: AI_STATUS
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  ENDPOINTS DE COACH IA (GEMINI)
// ══════════════════════════════════════════════════════════════════════════════

// Lista de Coaches
app.get('/api/coaches', (req, res) => {
  const lista = Object.values(COACHES).map(({ id, nombre, titulo, emoji, frase }) => ({
    id, nombre, titulo, emoji, frase
  }));
  res.json(lista);
});

// Helper para verificar si el usuario tiene acceso a los modelos de IA
const EMAIL_PERMITIDO_IA = 'guevara.cardona.yahir@gmail.com';

function validarAccesoIA(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return { permitido: false, motivo: 'Debes iniciar sesión con tu cuenta autorizada.' };
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    const email = (decoded.email || '').toLowerCase().trim();
    if (email === EMAIL_PERMITIDO_IA || email === 'admin@gymseminario.com') {
      return { permitido: true, user: decoded };
    }
    return { permitido: false, motivo: `Acceso restringido: Solo el administrador (${EMAIL_PERMITIDO_IA}) tiene acceso a las funciones de IA por el momento.` };
  } catch {
    return { permitido: false, motivo: 'Token de sesión expirado o inválido.' };
  }
}

// Chat con Coach IA
app.post('/api/coach/chat', limiterIA, async (req, res) => {
  const acceso = validarAccesoIA(req);
  if (!acceso.permitido) {
    return res.status(403).json({
      exito: false,
      coach: 'Sistema',
      respuesta: `⚠️ ${acceso.motivo}`
    });
  }
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

// Generar rutina de entrenamiento
app.post('/api/rutina', limiterIA, async (req, res) => {
  const acceso = validarAccesoIA(req);
  if (!acceso.permitido) {
    return res.status(403).json({
      exito: false,
      error: acceso.motivo
    });
  }
  try {
    const perfil = req.body;
    const resultado = await generarRutinaEntrenamiento(perfil);
    res.json(resultado);
  } catch (err) {
    console.error('Error en /api/rutina:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ENDPOINTS DE NOTIFICACIONES Y ASISTENCIA (NODEMAILER & TWILIO)
// ══════════════════════════════════════════════════════════════════════════════

app.post(['/enviar-correo', '/api/enviar-correo'], async (req, res) => {
  const { correo, nombre, entrenamiento, fecha, turno } = req.body;

  if (!correo || !nombre || !entrenamiento || !fecha || !turno) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const resultado = await sendBookingNotification({ correo, nombre, entrenamiento, fecha, turno });
    res.json({ mensaje: 'Correo enviado', resultado });
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    res.status(500).json({ error: 'Error al enviar el correo' });
  }
});

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

// Configuración Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'TU_TWILIO_ACCOUNT_SID';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'TU_TWILIO_AUTH_TOKEN';
let twilioClient = null;

if (accountSid && accountSid.startsWith('AC') && authToken && authToken !== 'TU_TWILIO_AUTH_TOKEN') {
  twilioClient = twilio(accountSid, authToken);
}

app.post('/enviar-sms', async (req, res) => {
  const { telefono, mensaje } = req.body;

  if (!twilioClient) {
    return res.status(503).json({ success: false, error: 'Servicio Twilio no configurado.' });
  }

  try {
    const response = await twilioClient.messages.create({
      body: mensaje,
      from: process.env.TWILIO_PHONE_NUMBER || '+15077095977',
      to: telefono,
    });

    res.status(200).send({ success: true, sid: response.sid });
  } catch (error) {
    console.error('Error al enviar SMS:', error);
    res.status(500).send({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH ENDPOINTS — JWT + SQLite (sin Firebase)
// ══════════════════════════════════════════════════════════════════════════════

// Registro
app.post('/api/auth/register', (req, res) => {
  const { email, password, nombre } = req.body;
  if (!email || !password || !nombre)
    return res.status(400).json({ error: 'Faltan datos: email, password y nombre son requeridos.' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (email, password, nombre, role) VALUES (?, ?, ?, ?)')
      .run(email.trim().toLowerCase(), hash, nombre.trim(), 'user');
    const user = { uid: result.lastInsertRowid, email: email.trim().toLowerCase(), nombre: nombre.trim(), role: 'user' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (e) {
    if (e.message.includes('UNIQUE'))
      return res.status(409).json({ error: 'El correo ya está registrado. Intenta iniciar sesión.' });
    console.error('Error en /api/auth/register:', e);
    res.status(500).json({ error: 'Error al registrar usuario.' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Faltan datos.' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  const payload = { uid: user.id, email: user.email, nombre: user.nombre, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: payload });
});

// Perfil propio (requiere token)
app.get('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado.' });
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    const user = db.prepare('SELECT id, email, nombre, role FROM users WHERE id = ?').get(decoded.uid);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json({ uid: user.id, email: user.email, nombre: user.nombre, role: user.role });
  } catch {
    res.status(401).json({ error: 'Token inválido.' });
  }
});

// Admin: listar todos los usuarios
app.get('/api/auth/users', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado.' });
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Solo administradores.' });
    const users = db.prepare('SELECT id, email, nombre, role, created_at FROM users').all();
    res.json(users);
  } catch {
    res.status(401).json({ error: 'Token inválido.' });
  }
});

// Admin: cambiar rol de usuario
app.post('/api/auth/set-role', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado.' });
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Solo administradores.' });
    const { userId, role } = req.body;
    if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Rol inválido. Usa admin o user.' });
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
    res.json({ ok: true, mensaje: `Rol actualizado a ${role}` });
  } catch {
    res.status(401).json({ error: 'Token inválido.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  GOOGLE OAUTH — verificar ID token y emitir JWT propio
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Token de Google requerido.' });
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email.toLowerCase().trim();
    const nombre = payload.name || email.split('@')[0];
    const esAdminAutorizado = email === 'guevara.cardona.yahir@gmail.com' || email === 'admin@gymseminario.com';

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      const assignedRole = esAdminAutorizado ? 'admin' : 'user';
      const info = db.prepare(
        "INSERT INTO users (email, password, nombre, role, provider) VALUES (?, '', ?, ?, 'google')"
      ).run(email, nombre, assignedRole);
      user = { id: info.lastInsertRowid, email, nombre, role: assignedRole };
    } else if (esAdminAutorizado && user.role !== 'admin') {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', user.id);
      user.role = 'admin';
    }

    const token = jwt.sign(
      { uid: user.id, email: user.email, nombre: user.nombre, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { uid: user.id, email: user.email, nombre: user.nombre, role: user.role } });
  } catch (e) {
    console.error('Error Google auth:', e.message);
    res.status(401).json({ error: 'Token de Google inválido o expirado.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  PHONE AUTH — demo con código 123456
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/auth/phone', (req, res) => {
  const { phone, code } = req.body;
  if (!phone) return res.status(400).json({ error: 'Número requerido.' });
  if (!code) {
    return res.json({ ok: true, mensaje: 'Código enviado. Para demo usa: 123456' });
  }
  if (code !== '123456') return res.status(401).json({ error: 'Código incorrecto.' });

  const email = `phone_${phone.replace(/\D/g, '')}@gymseminario.demo`;
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const info = db.prepare(
      "INSERT INTO users (email, password, nombre, role, provider) VALUES (?, '', ?, 'user', 'phone')"
    ).run(email, phone);
    user = { id: info.lastInsertRowid, email, nombre: phone, role: 'user' };
  }

  const token = jwt.sign(
    { uid: user.id, email: user.email, nombre: user.nombre, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { uid: user.id, email: user.email, nombre: user.nombre, role: user.role } });
});

// ══════════════════════════════════════════════════════════════════════════════
//  MEMBERSHIPS API — Persistencia en base de datos cloud (Render)
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
  console.log(`🚀 Servidor GROM Backend + Coach IA corriendo en http://localhost:${PORT}`);
});
