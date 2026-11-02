import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import rateLimit from 'express-rate-limit';

import { generarRutinaEntrenamiento } from './services/routineCoach.service.js';
import { COACHES, chatearConCoach } from './services/coachChat.service.js';

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

app.listen(PORT, () => {
  console.log(`🚀 Servidor GROM Backend + Coach IA corriendo en http://localhost:${PORT}`);
});
