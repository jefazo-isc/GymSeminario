import crypto from 'node:crypto';
import express from 'express';
import db, { todayIso, nowTimeHHMM } from '../services/db.js';
import { registrarAsistenciaEdge } from '../services/quota.service.js';
import {
  authGuard,
  requireRole,
  hasActiveMembership,
  isAdminRole,
  isPureReceptionRole,
  isStaffRole,
  normalizeRole,
} from '../middleware/auth.middleware.js';

export function createQrRouter() {
  const router = express.Router();

  router.post('/api/qr/issue', authGuard, (req, res) => {
    try {
      const { bookingId, clase, fecha, ttlMinutes, ttlSeconds } = req.body || {};
      const activeMem = hasActiveMembership(req.user.email);

      if (!activeMem && !isStaffRole(req.user)) {
        return res.status(403).json({
          ok: false,
          exito: false,
          codigo: 'SIN_MEMBRESIA_ACTIVA',
          error: 'Necesitas una membresía activa para generar tu pase QR de entrada.',
        });
      }

      const token = `GROM-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
      const effectiveSeconds =
        ttlSeconds !== undefined
          ? Math.max(15, Math.min(3600, Number(ttlSeconds)))
          : Math.max(60, Math.min(86400, Number(ttlMinutes || 60) * 60));
      const expiresAt = new Date(Date.now() + effectiveSeconds * 1000).toISOString();
      const targetFecha = String(fecha || todayIso()).trim();
      const targetClase = String(clase || 'Acceso General').trim();

      db.prepare(`
        INSERT INTO qr_tokens (token, token_type, user_email, booking_id, clase, fecha, expires_at)
        VALUES (?, 'member', ?, ?, ?, ?, ?)
      `).run(token, req.user.email, bookingId || null, targetClase, targetFecha, expiresAt);

      return res.status(201).json({
        ok: true,
        exito: true,
        token,
        tokenType: 'member',
        ttlSeconds: effectiveSeconds,
        userEmail: req.user.email,
        clase: targetClase,
        fecha: targetFecha,
        expiresAt,
        membership: activeMem
          ? { id: activeMem.id, planNombre: activeMem.plan_nombre, fechaFin: activeMem.fecha_fin }
          : { id: 'STAFF-PASS', planNombre: `Acceso Staff (${req.user.role})`, fechaFin: targetFecha },
      });
    } catch (err) {
      console.error('Error en /api/qr/issue:', err);
      return res.status(500).json({ error: 'Error al generar token QR.' });
    }
  });

  router.post('/api/qr/kiosk/issue', authGuard, requireRole('admin', 'reception'), (req, res) => {
    try {
      const ttlSeconds = Math.max(15, Math.min(120, Number(req.body?.ttlSeconds || 30)));
      const token = `GROM-K-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      const clase = String(req.body?.clase || 'Acceso Mostrador').trim();

      db.prepare(`
        INSERT INTO qr_tokens (token, token_type, user_email, booking_id, clase, fecha, expires_at)
        VALUES (?, 'kiosk', ?, NULL, ?, ?, ?)
      `).run(token, req.user.email, clase, todayIso(), expiresAt);

      return res.status(201).json({
        ok: true,
        exito: true,
        token,
        tokenType: 'kiosk',
        ttlSeconds,
        expiresAt,
      });
    } catch (err) {
      console.error('Error en /api/qr/kiosk/issue:', err);
      return res.status(500).json({ error: 'Error al generar código QR de mostrador.' });
    }
  });

  router.post('/api/qr/kiosk/checkin', authGuard, (req, res) => {
    try {
      if (isPureReceptionRole(req.user)) {
        return res.status(403).json({
          ok: false,
          exito: false,
          error: 'Usa el validador de mostrador para escanear socios.',
        });
      }

      const activeMem = hasActiveMembership(req.user.email);
      const canTrainOrAdmin = isAdminRole(req.user) || normalizeRole(req.user.role) === 'trainer';
      if (!activeMem && !canTrainOrAdmin) {
        return res.status(403).json({
          ok: false,
          exito: false,
          codigo: 'MEMBRESIA_VENCIDA',
          error: 'Necesitas una suscripción activa para tomar asistencia con QR.',
        });
      }

      const cleanToken = String(req.body?.token || '').trim();
      if (!cleanToken) {
        return res.status(400).json({
          ok: false,
          exito: false,
          codigo: 'QR_REQUERIDO',
          error: 'Token QR requerido.',
        });
      }

      const qrRow = db
        .prepare("SELECT * FROM qr_tokens WHERE token = ? AND token_type = 'kiosk'")
        .get(cleanToken);
      if (!qrRow) {
        return res.status(404).json({
          ok: false,
          exito: false,
          codigo: 'QR_INVALIDO',
          error: 'Código QR de mostrador no válido o no reconocido.',
        });
      }

      if (new Date(qrRow.expires_at).getTime() < Date.now()) {
        return res.status(403).json({
          ok: false,
          exito: false,
          codigo: 'QR_EXPIRADO',
          error: 'El código QR de mostrador ha expirado. Escanea el nuevo código en pantalla.',
        });
      }

      const alreadyLogged = db
        .prepare('SELECT id FROM attendances WHERE lower(email) = lower(?) AND qr_token = ?')
        .get(req.user.email, cleanToken);
      if (alreadyLogged) {
        return res.status(409).json({
          ok: false,
          exito: false,
          codigo: 'ASISTENCIA_YA_REGISTRADA',
          error: 'Ya registraste tu asistencia con este código QR.',
        });
      }

      const attendanceId = `att-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
      const fechaHoy = todayIso();
      const horaActual = nowTimeHHMM();
      const cleanClase = String(req.body?.clase || 'Acceso General').trim() || 'Acceso General';
      const memberName = req.user.nombre || req.user.email;

      db.transaction(() => {
        db.prepare(`
          INSERT INTO attendances (id, usuario, email, nombre, clase, fecha, hora, qr_token)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          attendanceId,
          String(req.user.uid),
          req.user.email,
          memberName,
          cleanClase,
          fechaHoy,
          horaActual,
          cleanToken,
        );
        registrarAsistenciaEdge(String(req.user.uid), cleanToken);
      })();

      return res.status(201).json({
        ok: true,
        exito: true,
        codigo: 'ACCESO_CONCEDIDO',
        mensaje: 'Asistencia registrada mediante QR de mostrador.',
        attendanceId,
        fecha: fechaHoy,
        hora: horaActual,
        clase: cleanClase,
        member: {
          email: req.user.email,
          nombre: memberName,
          planNombre: activeMem?.plan_nombre || 'Staff',
          fechaFin: activeMem?.fecha_fin || fechaHoy,
        },
      });
    } catch (err) {
      console.error('Error en /api/qr/kiosk/checkin:', err);
      return res.status(500).json({ error: 'Error al registrar asistencia con QR de mostrador.' });
    }
  });

  router.post('/api/qr/validate', authGuard, requireRole('admin', 'reception', 'trainer'), (req, res) => {
    try {
      const token = String(req.body?.token || '').trim();
      if (!token) {
        return res.status(400).json({ ok: false, exito: false, codigo: 'QR_REQUERIDO', error: 'Token QR requerido.' });
      }

      const qrRow = db.prepare('SELECT * FROM qr_tokens WHERE token = ?').get(token);
      if (!qrRow) {
        return res.status(404).json({
          ok: false,
          exito: false,
          codigo: 'QR_INVALIDO',
          error: 'Código QR no válido o no reconocido.',
        });
      }

      if (qrRow.token_type === 'kiosk') {
        return res.status(400).json({
          ok: false,
          exito: false,
          codigo: 'QR_MOSTRADOR',
          error: 'Este código pertenece al mostrador; debe ser escaneado por el socio desde su app.',
        });
      }

      if (qrRow.used_at) {
        return res.status(409).json({
          ok: false,
          exito: false,
          codigo: 'QR_YA_USADO',
          error: 'Este código QR ya fue utilizado para ingresar.',
          usedAt: qrRow.used_at,
        });
      }

      if (new Date(qrRow.expires_at).getTime() < Date.now()) {
        return res.status(403).json({
          ok: false,
          exito: false,
          codigo: 'QR_EXPIRADO',
          error: 'El código QR ha expirado. Solicita al socio generar uno nuevo.',
        });
      }

      const userRow = db
        .prepare('SELECT id, email, nombre, role FROM users WHERE lower(email) = lower(?)')
        .get(qrRow.user_email);
      const activeMem = hasActiveMembership(qrRow.user_email);
      const staffPass = userRow && isStaffRole(userRow);

      if (!activeMem && !staffPass) {
        return res.status(403).json({
          ok: false,
          exito: false,
          codigo: 'MEMBRESIA_VENCIDA',
          error: 'Membresía vencida o inactiva. Acceso denegado en recepción.',
        });
      }

      const attendanceId = `att-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
      const fechaHoy = todayIso();
      const horaActual = nowTimeHHMM();
      const memberName = userRow?.nombre || qrRow.user_email;

      const updated = db.transaction(() => {
        const markUsed = db
          .prepare("UPDATE qr_tokens SET used_at = datetime('now') WHERE token = ? AND used_at IS NULL")
          .run(token);
        if (markUsed.changes !== 1) {
          return false;
        }
        db.prepare(`
          INSERT INTO attendances (id, usuario, email, nombre, clase, fecha, hora, qr_token)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          attendanceId,
          userRow ? String(userRow.id) : null,
          qrRow.user_email,
          memberName,
          qrRow.clase || 'Acceso General',
          fechaHoy,
          horaActual,
          token,
        );
        registrarAsistenciaEdge(userRow ? String(userRow.id) : qrRow.user_email, token);
        return true;
      })();

      if (!updated) {
        return res.status(409).json({
          ok: false,
          exito: false,
          codigo: 'QR_YA_USADO',
          error: 'Este código QR ya fue utilizado.',
        });
      }

      return res.json({
        ok: true,
        exito: true,
        codigo: 'ACCESO_CONCEDIDO',
        mensaje: 'Acceso autorizado y asistencia registrada.',
        attendanceId,
        fecha: fechaHoy,
        hora: horaActual,
        clase: qrRow.clase,
        member: {
          email: qrRow.user_email,
          nombre: memberName,
          planNombre: activeMem?.plan_nombre || 'Staff',
          fechaFin: activeMem?.fecha_fin || fechaHoy,
        },
      });
    } catch (err) {
      console.error('Error en /api/qr/validate:', err);
      return res.status(500).json({ error: 'Error al validar código QR.' });
    }
  });

  router.post('/api/edge/asistencia', (req, res) => {
    const { uid, codigoQr } = req.body || {};
    if (!uid || !codigoQr) {
      return res.status(400).json({ error: 'UID y codigoQr requeridos' });
    }
    try {
      registrarAsistenciaEdge(uid, codigoQr);
      return res.json({ exito: true, mensaje: 'Asistencia registrada en el nodo Edge local' });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  return router;
}
