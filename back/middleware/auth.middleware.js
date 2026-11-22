import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import db, { ADMIN_EMAILS, todayIso } from '../services/db.js';
import { verificarYActualizarCuota } from '../services/quota.service.js';

const envSecret = (process.env.JWT_SECRET || '').trim();
if (!envSecret) {
  console.warn('⚠️ [AUTH] JWT_SECRET no configurado en variables de entorno; usando secreto efímero en memoria.');
}
export const JWT_SECRET = envSecret || crypto.randomBytes(32).toString('hex');

const RECEPTION_ROLES = new Set(['reception', 'receptionist', 'recepcionista', 'staff']);
const TRAINER_ROLES = new Set(['trainer', 'coach', 'entrenador']);
const SUBSCRIBER_ROLES = new Set(['subscriber', 'subscriptor', 'socio']);

export function normalizeRole(role) {
  const clean = String(role || 'user').toLowerCase().trim();
  if (clean === 'admin') return 'admin';
  if (RECEPTION_ROLES.has(clean)) return 'reception';
  if (TRAINER_ROLES.has(clean)) return 'trainer';
  if (SUBSCRIBER_ROLES.has(clean)) return 'subscriber';
  return 'user';
}

export function isAdminRole(user) {
  if (!user) return false;
  const email = String(user.email || '').toLowerCase().trim();
  return ADMIN_EMAILS.has(email) || normalizeRole(user.role) === 'admin';
}

export function isReceptionOrAdminRole(user) {
  if (!user) return false;
  const norm = normalizeRole(user.role);
  return isAdminRole(user) || norm === 'reception';
}

export function isPureReceptionRole(user) {
  if (!user) return false;
  return !isAdminRole(user) && normalizeRole(user.role) === 'reception';
}

export function isStaffRole(user) {
  if (!user) return false;
  const norm = normalizeRole(user.role);
  return isReceptionOrAdminRole(user) || norm === 'trainer';
}

export function signAuthToken(user) {
  const payload = {
    uid: user.uid ?? user.id,
    email: String(user.email || '').toLowerCase().trim(),
    nombre: user.nombre || '',
    role: user.role || 'user',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyRequestJwt(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new Error('Token vacío');
  }
  const decoded = jwt.verify(token, JWT_SECRET);
  if (!decoded || typeof decoded !== 'object' || !decoded.email) {
    throw new Error('Payload JWT inválido');
  }
  const email = String(decoded.email).toLowerCase().trim();
  const dbUser = db
    .prepare('SELECT id, email, nombre, role FROM users WHERE lower(email) = ? LIMIT 1')
    .get(email);

  const effectiveRole = ADMIN_EMAILS.has(email)
    ? 'admin'
    : dbUser?.role || decoded.role || 'user';

  return {
    uid: dbUser?.id ?? decoded.uid ?? decoded.sub ?? email,
    email,
    nombre: dbUser?.nombre || decoded.nombre || decoded.name || '',
    role: effectiveRole,
  };
}

export function authGuard(req, res, next) {
  try {
    const user = verifyRequestJwt(req);
    if (!user) {
      return res.status(401).json({ error: 'Acceso no autorizado: Token requerido.' });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token de autenticación inválido o expirado.' });
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.user = null;
    return next();
  }
  try {
    req.user = verifyRequestJwt(req);
    return next();
  } catch {
    return res.status(401).json({ error: 'Token de autenticación inválido o expirado.' });
  }
}

export function requireRole(...allowedRoles) {
  const allowedNormalized = new Set(allowedRoles.map(normalizeRole));
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Acceso no autorizado: Token requerido.' });
    }
    const userNorm = isAdminRole(req.user) ? 'admin' : normalizeRole(req.user.role);
    if (userNorm === 'admin' || allowedNormalized.has(userNorm)) {
      return next();
    }
    return res.status(403).json({
      error: 'Permisos insuficientes para realizar esta operación.',
    });
  };
}

export function authAndQuotaGuard(req, res, next) {
  try {
    const user = verifyRequestJwt(req);
    if (!user) {
      return res.status(401).json({ error: 'Acceso no autorizado: Token requerido.' });
    }
    req.user = user;
  } catch {
    return res.status(401).json({ error: 'Token de autenticación inválido.' });
  }

  const cuota = verificarYActualizarCuota(String(req.user.uid), req.user.email);
  if (!cuota.permitida) {
    return res.status(429).json({
      error: 'Has alcanzado el límite diario de consultas con el Coach IA. Vuelve mañana.',
      restantes: 0,
    });
  }

  req.cuotaRestante = cuota.restantes;
  return next();
}

export function hasActiveMembership(email) {
  const cleanEmail = String(email || '').toLowerCase().trim();
  if (!cleanEmail) return null;
  const hoy = todayIso();
  return db
    .prepare(
      `SELECT * FROM memberships
       WHERE lower(user_email) = ? AND estado = 'Activa' AND fecha_fin >= ?
       ORDER BY datetime(updated_at) DESC LIMIT 1`,
    )
    .get(cleanEmail, hoy);
}

export function verificarMembresiaBackend(req, res, next) {
  let user = null;
  try {
    user = verifyRequestJwt(req);
  } catch {
    return res.status(401).json({
      exito: false,
      error: 'Token inválido o expirado. Inicia sesión nuevamente.',
    });
  }

  if (!user) {
    return res.status(401).json({
      exito: false,
      error: 'Autenticación requerida: Inicia sesión con una cuenta activa para usar el Coach Virtual IA.',
    });
  }

  req.user = user;
  if (isPureReceptionRole(user)) {
    return res.status(403).json({
      exito: false,
      error: 'El rol de recepción no tiene acceso al Coach Virtual IA.',
    });
  }

  const normRole = normalizeRole(user.role);

  if (
    isAdminRole(user) ||
    normRole === 'trainer' ||
    normRole === 'subscriber'
  ) {
    return next();
  }

  try {
    const mem = hasActiveMembership(user.email);
    if (mem) {
      req.activeMembership = mem;
      return next();
    }
  } catch (err) {
    console.warn('Error verificando membresía en backend:', err.message);
  }

  return res.status(403).json({
    exito: false,
    error: 'Tu cuenta no cuenta con una membresía activa. Adquiere un plan para utilizar el Coach IA.',
  });
}
