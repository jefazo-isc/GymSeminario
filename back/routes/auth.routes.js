import crypto from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import twilio from 'twilio';
import { OAuth2Client } from 'google-auth-library';
import db, { ADMIN_EMAILS } from '../services/db.js';
import {
  authGuard,
  requireRole,
  signAuthToken,
  normalizeRole,
} from '../middleware/auth.middleware.js';

const DEFAULT_GOOGLE_CLIENT_ID =
  '284503632870-hup11ff07or46r457spa5bj42nr26rdt.apps.googleusercontent.com';

const ALLOWED_ROLES = new Set([
  'admin',
  'reception',
  'receptionist',
  'recepcionista',
  'staff',
  'trainer',
  'coach',
  'entrenador',
  'subscriber',
  'subscriptor',
  'user',
]);

function getTwilioClient() {
  const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  if (sid.startsWith('AC') && token) {
    return twilio(sid, token);
  }
  return null;
}

export function createAuthRouter({ verifyGoogleToken, twilioClientOverride } = {}) {
  const router = express.Router();
  const googleClientId = process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
  const googleClient = new OAuth2Client(googleClientId);

  async function verifyGoogleCredential(credential) {
    if (typeof verifyGoogleToken === 'function') {
      return verifyGoogleToken(credential, googleClientId);
    }
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });
    return ticket.getPayload();
  }

  router.post('/api/auth/register', (req, res) => {
    const { email, password, nombre } = req.body || {};
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Faltan datos: email, password y nombre son requeridos.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(nombre).trim();
    const assignedRole = ADMIN_EMAILS.has(cleanEmail) ? 'admin' : 'user';

    try {
      const hash = bcrypt.hashSync(String(password), 10);
      const result = db
        .prepare('INSERT INTO users (email, password, nombre, role, provider) VALUES (?, ?, ?, ?, ?)')
        .run(cleanEmail, hash, cleanName, assignedRole, 'email');
      const user = { uid: result.lastInsertRowid, email: cleanEmail, nombre: cleanName, role: assignedRole };
      const token = signAuthToken(user);
      return res.status(201).json({ token, user });
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'El correo ya está registrado. Intenta iniciar sesión.' });
      }
      console.error('Error en /api/auth/register:', err);
      return res.status(500).json({ error: 'Error al registrar usuario.' });
    }
  });

  router.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan datos.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(cleanEmail);
    if (!user || !user.password || !bcrypt.compareSync(String(password), user.password)) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }
    const payload = { uid: user.id, email: user.email, nombre: user.nombre, role: user.role };
    const token = signAuthToken(payload);
    return res.json({ token, user: payload });
  });

  router.get('/api/auth/me', authGuard, (req, res) => {
    const user = db
      .prepare('SELECT id, email, nombre, role, provider FROM users WHERE lower(email) = ?')
      .get(req.user.email);
    if (!user) {
      return res.json({
        uid: req.user.uid,
        email: req.user.email,
        nombre: req.user.nombre,
        role: req.user.role,
      });
    }
    return res.json({
      uid: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      provider: user.provider,
    });
  });

  router.post('/api/auth/change-password', authGuard, (req, res) => {
    const body = req.body || {};
    const currentPassword = body.currentPassword ?? body.passwordActual ?? '';
    const newPassword = body.newPassword ?? body.nuevaPassword ?? '';

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const user = db
      .prepare('SELECT id, email, password FROM users WHERE lower(email) = ?')
      .get(req.user.email);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (user.password && !bcrypt.compareSync(String(currentPassword), user.password)) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
    }

    const nextHash = bcrypt.hashSync(String(newPassword), 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(nextHash, user.id);
    return res.json({ ok: true, exito: true, mensaje: 'Contraseña actualizada correctamente.' });
  });

  router.post('/api/auth/google', async (req, res) => {
    const credential = req.body?.credential || req.body?.idToken;
    if (!credential) {
      return res.status(400).json({ error: 'Token de Google requerido.' });
    }
    try {
      const payload = await verifyGoogleCredential(credential);
      if (!payload?.email) {
        return res.status(401).json({ error: 'Token de Google sin correo verificado.' });
      }
      const email = String(payload.email).toLowerCase().trim();
      const nombre = payload.name || email.split('@')[0];
      const esAdmin = ADMIN_EMAILS.has(email);

      let user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
      if (!user) {
        const assignedRole = esAdmin ? 'admin' : 'user';
        const info = db
          .prepare("INSERT INTO users (email, password, nombre, role, provider) VALUES (?, '', ?, ?, 'google')")
          .run(email, nombre, assignedRole);
        user = { id: info.lastInsertRowid, email, nombre, role: assignedRole };
      } else if (esAdmin && user.role !== 'admin') {
        db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', user.id);
        user.role = 'admin';
      }

      const tokenPayload = { uid: user.id, email: user.email, nombre: user.nombre, role: user.role };
      const token = signAuthToken(tokenPayload);
      return res.json({ token, user: tokenPayload });
    } catch (err) {
      console.error('Error Google auth:', err.message);
      return res.status(401).json({ error: 'Token de Google inválido o expirado.' });
    }
  });

  router.post('/api/auth/phone', async (req, res) => {
    const { phone, code } = req.body || {};
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ error: 'Número requerido.' });
    }
    const cleanPhone = String(phone).trim();
    const digits = cleanPhone.replace(/\D/g, '');
    if (digits.length < 7) {
      return res.status(400).json({ error: 'Número telefónico inválido.' });
    }

    if (!code) {
      const otp = String(crypto.randomInt(100000, 999999));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      db.prepare(`
        INSERT INTO phone_otps (phone, code, expires_at, attempts, created_at)
        VALUES (?, ?, ?, 0, datetime('now'))
        ON CONFLICT(phone) DO UPDATE SET
          code = excluded.code,
          expires_at = excluded.expires_at,
          attempts = 0,
          created_at = datetime('now')
      `).run(digits, otp, expiresAt);

      const twilioClient = twilioClientOverride ?? getTwilioClient();
      if (twilioClient) {
        try {
          await twilioClient.messages.create({
            body: `Tu código de acceso espacioGYM es: ${otp}. Válido por 10 minutos.`,
            from: process.env.TWILIO_PHONE_NUMBER || '+15077095977',
            to: cleanPhone,
          });
        } catch (err) {
          console.error('Error enviando OTP vía Twilio:', err.message);
          return res.status(502).json({ error: 'No se pudo enviar el código SMS.' });
        }
      }

      const payload = { ok: true, mensaje: 'Código de verificación enviado por SMS.' };
      if (process.env.NODE_ENV !== 'production' && !twilioClient) {
        payload.devCode = otp;
      }
      return res.json(payload);
    }

    const row = db.prepare('SELECT * FROM phone_otps WHERE phone = ?').get(digits);
    if (!row) {
      return res.status(401).json({ error: 'No hay código pendiente para este número.' });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      db.prepare('DELETE FROM phone_otps WHERE phone = ?').run(digits);
      return res.status(401).json({ error: 'El código OTP ha expirado.' });
    }
    if (row.attempts >= 5) {
      return res.status(429).json({ error: 'Demasiados intentos fallidos. Solicita un nuevo código.' });
    }
    if (String(code).trim() !== row.code) {
      db.prepare('UPDATE phone_otps SET attempts = attempts + 1 WHERE phone = ?').run(digits);
      return res.status(401).json({ error: 'Código incorrecto.' });
    }

    db.prepare('DELETE FROM phone_otps WHERE phone = ?').run(digits);

    const email = `phone_${digits}@espaciogym.mx`;
    let user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
    if (!user) {
      const info = db
        .prepare("INSERT INTO users (email, password, nombre, role, provider) VALUES (?, '', ?, 'user', 'phone')")
        .run(email, cleanPhone);
      user = { id: info.lastInsertRowid, email, nombre: cleanPhone, role: 'user' };
    }

    const tokenPayload = { uid: user.id, email: user.email, nombre: user.nombre, role: user.role };
    const token = signAuthToken(tokenPayload);
    return res.json({ token, user: tokenPayload });
  });

  router.get('/api/auth/users', authGuard, requireRole('admin'), (_req, res) => {
    try {
      const users = db
        .prepare('SELECT id, email, nombre, role, provider, created_at FROM users ORDER BY id ASC')
        .all();
      const memberships = db
        .prepare(
          `SELECT user_email, plan_nombre, estado, fecha_fin
           FROM memberships
           ORDER BY datetime(updated_at) DESC`,
        )
        .all();
      const memByEmail = new Map();
      for (const m of memberships) {
        const key = String(m.user_email || '').toLowerCase();
        if (!memByEmail.has(key)) memByEmail.set(key, m);
      }

      const enriched = users.map((u) => ({
        ...u,
        normalizedRole: normalizeRole(u.role),
        membresia: memByEmail.get(String(u.email).toLowerCase()) || null,
      }));
      return res.json(enriched);
    } catch (err) {
      console.error('Error listando usuarios:', err);
      return res.status(500).json({ error: 'Error al consultar usuarios.' });
    }
  });

  router.post('/api/auth/set-role', authGuard, requireRole('admin'), (req, res) => {
    const { userId, email, role } = req.body || {};
    const rawRole = String(role || '').toLowerCase().trim();
    if (!ALLOWED_ROLES.has(rawRole)) {
      return res.status(400).json({
        error: 'Rol inválido. Usa admin, reception, receptionist, trainer, subscriber o user.',
      });
    }
    if (!userId && !email) {
      return res.status(400).json({ error: 'Debes indicar userId o email.' });
    }

    const target = userId
      ? db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId)
      : db.prepare('SELECT id, email FROM users WHERE lower(email) = lower(?)').get(String(email).trim());

    if (!target) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    if (ADMIN_EMAILS.has(String(target.email).toLowerCase().trim()) && normalizeRole(rawRole) !== 'admin') {
      return res.status(403).json({ error: 'No se puede degradar el rol de un administrador principal.' });
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(rawRole, target.id);
    return res.json({ ok: true, role: rawRole, mensaje: `Rol actualizado a ${rawRole}` });
  });

  router.post(['/enviar-sms', '/api/enviar-sms'], authGuard, async (req, res) => {
    const { telefono, mensaje } = req.body || {};
    if (!telefono || !mensaje) {
      return res.status(400).json({ success: false, error: 'Teléfono y mensaje requeridos.' });
    }
    const twilioClient = twilioClientOverride ?? getTwilioClient();
    if (!twilioClient) {
      return res.status(503).json({ success: false, error: 'Servicio Twilio no configurado.' });
    }
    try {
      const response = await twilioClient.messages.create({
        body: String(mensaje),
        from: process.env.TWILIO_PHONE_NUMBER || '+15077095977',
        to: String(telefono),
      });
      return res.status(200).json({ success: true, sid: response.sid });
    } catch (err) {
      console.error('Error al enviar SMS:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
