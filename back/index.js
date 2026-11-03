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

import { generarRutinaEntrenamiento } from './services/routineCoach.service.js';
import { COACHES, chatearConCoach } from './services/coachChat.service.js';

const db = new Database('./gym.db');
const JWT_SECRET = process.env.JWT_SECRET || 'gym-seminario-secret-2026';

// Crear tabla de usuarios si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nombre TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Crear usuario admin por defecto si no existe
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@gymseminario.com');
if (!adminExists) {
  const hash = bcrypt.hashSync('Admin1234!', 10);
  db.prepare("INSERT INTO users (email, password, nombre, role) VALUES (?, ?, ?, ?)").run('admin@gymseminario.com', hash, 'Administrador', 'admin');
  console.log('✅ Usuario admin creado: admin@gymseminario.com / Admin1234!');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

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

// Chat con Coach IA
app.post('/api/coach/chat', limiterIA, async (req, res) => {
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

app.post('/enviar-correo', async (req, res) => {
  const { correo, nombre, entrenamiento, fecha, turno } = req.body;

  if (!correo || !nombre || !entrenamiento || !fecha || !turno) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'carlosvm12345678@gmail.com',
      pass: process.env.EMAIL_PASS || 'temoxwazusjxxrnr'
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER || 'carlosvm12345678@gmail.com',
    to: correo,
    subject: 'Confirmación de entrenamiento',
    text: `Hola ${nombre},\n\nGracias por registrarte al entrenamiento. Aquí están los detalles:\n\n- 🏋️ Entrenamiento: ${entrenamiento}\n- 📅 Fecha: ${fecha}\n- ⏰ Turno: ${turno}\n\n¡Nos vemos pronto!\n\nSaludos,\nGROM`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ mensaje: 'Correo enviado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar el correo' });
  }
});

app.post('/enviar-asistencia', async (req, res) => {
  const { correo, nombre, clase, fecha, hora } = req.body;

  if (!correo || !nombre || !clase || !fecha || !hora) {
    return res.status(400).json({ mensaje: 'Faltan campos requeridos.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'carlosvm12345678@gmail.com',
        pass: process.env.EMAIL_PASS || 'temoxwazusjxxrnr'
      }
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER || 'tu-correo@gmail.com',
      to: correo,
      subject: 'Confirmación de Asistencia',
      html: `
        <h2>Hola ${nombre}</h2>
        <p>Tu asistencia se ha registrado correctamente:</p>
        <ul>
          <li><strong>Clase:</strong> ${clase}</li>
          <li><strong>Fecha:</strong> ${fecha}</li>
          <li><strong>Hora:</strong> ${hora}</li>
        </ul>
        <p>¡Gracias por asistir!</p>
      `
    });

    res.status(200).json({ mensaje: 'Correo enviado', info });
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

app.listen(PORT, () => {
  console.log(`🚀 Servidor GROM Backend + Coach IA corriendo en http://localhost:${PORT}`);
});
