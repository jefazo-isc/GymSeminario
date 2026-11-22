import crypto from 'node:crypto';
import express from 'express';
import db, { todayIso } from '../services/db.js';
import { sendExpiryNotification } from '../services/email.service.js';
import {
  authGuard,
  optionalAuth,
  requireRole,
  isReceptionOrAdminRole,
} from '../middleware/auth.middleware.js';

function mapMembershipRow(mem) {
  return {
    id: mem.id,
    userEmail: mem.user_email,
    nombrePlan: mem.plan_nombre,
    precio: mem.precio,
    periodo: mem.periodo,
    fechaInicio: mem.fecha_inicio,
    fechaFin: mem.fecha_fin,
    estado: mem.estado,
    autoRenew: Boolean(mem.auto_renew),
    beneficios: JSON.parse(mem.beneficios || '[]'),
  };
}

function appendMembershipHistory({
  membershipId,
  userEmail,
  planNombre,
  precio,
  periodo,
  fechaInicio,
  fechaFin,
  accion,
  actorEmail,
}) {
  const histId = `MH-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
  db.prepare(`
    INSERT INTO membership_history (
      id, membership_id, user_email, plan_nombre, precio, periodo, fecha_inicio, fecha_fin, accion, actor_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    histId,
    membershipId || null,
    userEmail,
    planNombre,
    Number(precio || 0),
    periodo || 'Mensual',
    fechaInicio,
    fechaFin,
    accion,
    actorEmail || userEmail,
  );
}

export function createMembershipRouter() {
  const router = express.Router();

  router.get('/api/membership', optionalAuth, (req, res) => {
    try {
      const requestedEmail = String(req.query.email || '').toLowerCase().trim();
      const targetEmail =
        req.user && !isReceptionOrAdminRole(req.user)
          ? req.user.email
          : requestedEmail || req.user?.email || '';

      if (!targetEmail) {
        return res.status(400).json({ error: 'Email requerido' });
      }

      const mem = db
        .prepare(
          `SELECT * FROM memberships
           WHERE lower(user_email) = lower(?)
           ORDER BY datetime(updated_at) DESC
           LIMIT 1`,
        )
        .get(targetEmail);

      if (!mem) {
        return res.status(404).json({ error: 'No se encontró membresía' });
      }
      return res.json(mapMembershipRow(mem));
    } catch (err) {
      console.error('Error al consultar membresía:', err);
      return res.status(500).json({ error: 'Error al consultar membresía' });
    }
  });

  router.get('/api/membership/history', authGuard, (req, res) => {
    try {
      const requestedEmail = String(req.query.email || '').toLowerCase().trim();
      const isStaff = isReceptionOrAdminRole(req.user);
      const targetEmail = isStaff && requestedEmail ? requestedEmail : req.user.email;

      const rows =
        isStaff && !requestedEmail
          ? db.prepare('SELECT * FROM membership_history ORDER BY datetime(created_at) DESC LIMIT 200').all()
          : db
              .prepare(
                'SELECT * FROM membership_history WHERE lower(user_email) = lower(?) ORDER BY datetime(created_at) DESC',
              )
              .all(targetEmail);

      return res.json(rows);
    } catch (err) {
      console.error('Error al consultar historial de membresías:', err);
      return res.status(500).json({ error: 'Error al consultar historial de membresías' });
    }
  });

  router.post('/api/membership', authGuard, (req, res) => {
    try {
      const { email, id, nombrePlan, precio, periodo, fechaInicio, fechaFin, estado, beneficios, autoRenew } =
        req.body || {};
      const isStaff = isReceptionOrAdminRole(req.user);
      const targetEmail = (isStaff && email ? email : req.user.email).toLowerCase().trim();

      if (!targetEmail || !nombrePlan) {
        return res.status(400).json({ error: 'Datos de membresía incompletos' });
      }

      if (!isStaff) {
        const existing = db
          .prepare('SELECT id FROM memberships WHERE lower(user_email) = lower(?) LIMIT 1')
          .get(targetEmail);
        if (!existing && (estado || 'Activa') === 'Activa') {
          return res.status(403).json({
            error: 'Usa /api/stripe/confirm-payment para activar una nueva membresía.',
          });
        }
      }

      const memId = id || `MEM-${crypto.randomInt(100000, 999999)}`;
      const beneficiosJson = JSON.stringify(beneficios || []);

      db.prepare(`
        INSERT INTO memberships (
          id, user_email, plan_nombre, precio, periodo, fecha_inicio, fecha_fin, estado, auto_renew, beneficios, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          plan_nombre = excluded.plan_nombre,
          precio = excluded.precio,
          periodo = excluded.periodo,
          fecha_inicio = excluded.fecha_inicio,
          fecha_fin = excluded.fecha_fin,
          estado = excluded.estado,
          auto_renew = excluded.auto_renew,
          beneficios = excluded.beneficios,
          updated_at = datetime('now')
      `).run(
        memId,
        targetEmail,
        nombrePlan,
        Number(precio || 0),
        periodo || 'Mensual',
        fechaInicio || todayIso(),
        fechaFin || todayIso(),
        estado || 'Activa',
        autoRenew ? 1 : 0,
        beneficiosJson,
      );

      appendMembershipHistory({
        membershipId: memId,
        userEmail: targetEmail,
        planNombre,
        precio,
        periodo,
        fechaInicio: fechaInicio || todayIso(),
        fechaFin: fechaFin || todayIso(),
        accion: 'ACTUALIZACION',
        actorEmail: req.user.email,
      });

      return res.json({ ok: true, mensaje: 'Membresía guardada en la base de datos', id: memId });
    } catch (err) {
      console.error('Error al guardar membresía:', err);
      return res.status(500).json({ error: 'Error al registrar membresía' });
    }
  });

  router.post('/api/membership/renew', authGuard, (req, res) => {
    try {
      const { id, fechaFin, estado } = req.body || {};
      if (!id || !fechaFin) {
        return res.status(400).json({ error: 'ID y fecha de fin requeridos' });
      }
      const existing = db.prepare('SELECT * FROM memberships WHERE id = ?').get(id);
      if (!existing) {
        return res.status(404).json({ error: 'Membresía no encontrada' });
      }
      const isStaff = isReceptionOrAdminRole(req.user);
      if (!isStaff && existing.user_email.toLowerCase() !== req.user.email) {
        return res.status(403).json({ error: 'No autorizado para renovar esta membresía.' });
      }

      const nextEstado = estado || 'Activa';
      db.prepare(`
        UPDATE memberships
        SET fecha_fin = ?, estado = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(fechaFin, nextEstado, id);

      appendMembershipHistory({
        membershipId: id,
        userEmail: existing.user_email,
        planNombre: existing.plan_nombre,
        precio: existing.precio,
        periodo: existing.periodo,
        fechaInicio: existing.fecha_inicio,
        fechaFin,
        accion: 'RENOVACION',
        actorEmail: req.user.email,
      });

      return res.json({ ok: true, mensaje: 'Membresía renovada en la base de datos' });
    } catch (err) {
      console.error('Error al renovar membresía:', err);
      return res.status(500).json({ error: 'Error al renovar membresía' });
    }
  });

  router.post('/api/membership/auto-renew', authGuard, (req, res) => {
    try {
      const { id, autoRenew } = req.body || {};
      const existing = id
        ? db.prepare('SELECT * FROM memberships WHERE id = ?').get(id)
        : db
            .prepare(
              'SELECT * FROM memberships WHERE lower(user_email) = lower(?) ORDER BY datetime(updated_at) DESC LIMIT 1',
            )
            .get(req.user.email);

      if (!existing) {
        return res.status(404).json({ error: 'Membresía no encontrada' });
      }
      if (!isReceptionOrAdminRole(req.user) && existing.user_email.toLowerCase() !== req.user.email) {
        return res.status(403).json({ error: 'No autorizado.' });
      }

      const flag = autoRenew ? 1 : 0;
      db.prepare("UPDATE memberships SET auto_renew = ?, updated_at = datetime('now') WHERE id = ?").run(
        flag,
        existing.id,
      );

      appendMembershipHistory({
        membershipId: existing.id,
        userEmail: existing.user_email,
        planNombre: existing.plan_nombre,
        precio: existing.precio,
        periodo: existing.periodo,
        fechaInicio: existing.fecha_inicio,
        fechaFin: existing.fecha_fin,
        accion: flag ? 'AUTO_RENEW_ON' : 'AUTO_RENEW_OFF',
        actorEmail: req.user.email,
      });

      return res.json({ ok: true, id: existing.id, autoRenew: Boolean(flag) });
    } catch (err) {
      console.error('Error en /api/membership/auto-renew:', err);
      return res.status(500).json({ error: 'Error al actualizar auto-renovación' });
    }
  });

  router.post('/api/admin/memberships/assign', authGuard, requireRole('admin'), (req, res) => {
    try {
      const body = req.body || {};
      const targetEmail = String(body.userEmail || body.email || '').toLowerCase().trim();
      const action = String(body.action || 'assign').toLowerCase().trim();

      if (!targetEmail) {
        return res.status(400).json({ error: 'userEmail es requerido.' });
      }

      const current = db
        .prepare(
          'SELECT * FROM memberships WHERE lower(user_email) = lower(?) ORDER BY datetime(updated_at) DESC LIMIT 1',
        )
        .get(targetEmail);

      if (action === 'cancel') {
        if (!current) {
          return res.status(404).json({ error: 'El usuario no tiene membresía para cancelar.' });
        }
        db.prepare("UPDATE memberships SET estado = 'Cancelada', auto_renew = 0, updated_at = datetime('now') WHERE id = ?").run(
          current.id,
        );
        appendMembershipHistory({
          membershipId: current.id,
          userEmail: targetEmail,
          planNombre: current.plan_nombre,
          precio: current.precio,
          periodo: current.periodo,
          fechaInicio: current.fecha_inicio,
          fechaFin: current.fecha_fin,
          accion: 'CANCELACION_ADMIN',
          actorEmail: req.user.email,
        });
        return res.json({ ok: true, mensaje: 'Membresía cancelada correctamente', id: current.id, estado: 'Cancelada' });
      }

      const planNombre = body.planNombre || current?.plan_nombre || 'Plan Pro';
      const periodo = body.periodo || current?.periodo || 'Mensual';
      const precio = body.precio !== undefined ? Number(body.precio) : Number(current?.precio || 550);
      const meses = periodo === 'Anual' ? 12 : periodo === 'Trimestral' ? 3 : 1;

      const baseStart = body.fechaInicio ? new Date(body.fechaInicio) : new Date();
      const baseEnd =
        action === 'extend' && current?.fecha_fin
          ? new Date(current.fecha_fin)
          : new Date(baseStart);
      if (!body.fechaFin) {
        baseEnd.setMonth(baseEnd.getMonth() + meses);
      }

      const fInicioStr = body.fechaInicio || baseStart.toISOString().split('T')[0];
      const fFinStr = body.fechaFin || baseEnd.toISOString().split('T')[0];
      const memId = current?.id && action !== 'assign' ? current.id : `MEM-${crypto.randomInt(100000, 999999)}`;
      const beneficiosJson = JSON.stringify(
        body.beneficios ||
          (current?.beneficios ? JSON.parse(current.beneficios) : [
            'Acceso total a gimnasio y vestidores',
            'Coach Virtual IA ilimitado',
            'Generación de código QR para asistencia',
          ]),
      );

      db.transaction(() => {
        db.prepare(`
          INSERT INTO memberships (
            id, user_email, plan_nombre, precio, periodo, fecha_inicio, fecha_fin, estado, auto_renew, beneficios, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Activa', ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            plan_nombre = excluded.plan_nombre,
            precio = excluded.precio,
            periodo = excluded.periodo,
            fecha_inicio = excluded.fecha_inicio,
            fecha_fin = excluded.fecha_fin,
            estado = 'Activa',
            auto_renew = excluded.auto_renew,
            beneficios = excluded.beneficios,
            updated_at = datetime('now')
        `).run(memId, targetEmail, planNombre, precio, periodo, fInicioStr, fFinStr, body.autoRenew ? 1 : 0, beneficiosJson);

        db.prepare("UPDATE users SET role = 'subscriber' WHERE lower(email) = lower(?) AND role = 'user'").run(
          targetEmail,
        );

        appendMembershipHistory({
          membershipId: memId,
          userEmail: targetEmail,
          planNombre,
          precio,
          periodo,
          fechaInicio: fInicioStr,
          fechaFin: fFinStr,
          accion: action === 'extend' ? 'EXTENSION_ADMIN' : action === 'renew' ? 'RENOVACION_ADMIN' : 'ASIGNACION_ADMIN',
          actorEmail: req.user.email,
        });
      })();

      return res.json({
        ok: true,
        mensaje: 'Membresía actualizada administrativamente',
        membresia: {
          id: memId,
          userEmail: targetEmail,
          nombrePlan: planNombre,
          precio,
          periodo,
          fechaInicio: fInicioStr,
          fechaFin: fFinStr,
          estado: 'Activa',
        },
      });
    } catch (err) {
      console.error('Error en /api/admin/memberships/assign:', err);
      return res.status(500).json({ error: 'Error al asignar membresía' });
    }
  });

  router.get('/api/reception/subscribers', authGuard, requireRole('admin', 'reception'), (_req, res) => {
    try {
      const hoyStr = todayIso();
      const rows = db
        .prepare(
          `SELECT m.*, u.nombre as user_nombre, u.role as user_role
           FROM memberships m
           LEFT JOIN users u ON lower(u.email) = lower(m.user_email)
           ORDER BY datetime(m.updated_at) DESC`,
        )
        .all();

      const seen = new Set();
      const list = [];
      for (const r of rows) {
        const key = String(r.user_email || '').toLowerCase().trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);

        const diffMs = new Date(r.fecha_fin + 'T00:00:00').getTime() - new Date(hoyStr + 'T00:00:00').getTime();
        const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        let estado = r.estado || 'Activa';
        if (String(estado).toLowerCase() === 'cancelada' || diasRestantes <= 0) {
          estado = 'Vencida';
        } else if (diasRestantes <= 5) {
          estado = 'Por vencer';
        } else {
          estado = 'Activa';
        }

        list.push({
          id: r.id,
          nombre: r.user_nombre || key.split('@')[0],
          email: r.user_email,
          nombrePlan: r.plan_nombre,
          precio: Number(r.precio || 0),
          periodo: r.periodo || 'Mensual',
          fechaInicio: r.fecha_inicio,
          fechaFin: r.fecha_fin,
          diasRestantes,
          estado,
        });
      }

      return res.json(list);
    } catch (err) {
      console.error('Error en /api/reception/subscribers:', err);
      return res.status(500).json({ error: 'Error al consultar socios con suscripción' });
    }
  });

  router.get('/api/admin/expiring-memberships', authGuard, requireRole('admin'), (req, res) => {
    try {
      const days = Math.max(1, Math.min(90, Number(req.query.days || 7)));
      const hoy = new Date();
      const limite = new Date(hoy);
      limite.setDate(limite.getDate() + days);

      const hoyStr = hoy.toISOString().split('T')[0];
      const limiteStr = limite.toISOString().split('T')[0];

      const rows = db
        .prepare(
          `SELECT m.*, u.nombre as user_nombre
           FROM memberships m
           LEFT JOIN users u ON lower(u.email) = lower(m.user_email)
           WHERE m.estado = 'Activa' AND m.fecha_fin >= ? AND m.fecha_fin <= ?
           ORDER BY m.fecha_fin ASC`,
        )
        .all(hoyStr, limiteStr);

      const enriched = rows.map((r) => {
        const diffMs = new Date(r.fecha_fin).getTime() - new Date(hoyStr).getTime();
        const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        return {
          ...mapMembershipRow(r),
          nombreUsuario: r.user_nombre || r.user_email,
          diasRestantes,
        };
      });

      return res.json(enriched);
    } catch (err) {
      console.error('Error en /api/admin/expiring-memberships:', err);
      return res.status(500).json({ error: 'Error al consultar membresías por vencer' });
    }
  });

  router.post('/api/admin/notify-expiring', authGuard, requireRole('admin'), async (req, res) => {
    try {
      const days = Math.max(1, Math.min(90, Number(req.body?.days || 7)));
      const filterEmail = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
      const hoyStr = todayIso();
      const limite = new Date();
      limite.setDate(limite.getDate() + days);
      const limiteStr = limite.toISOString().split('T')[0];

      let rows = db
        .prepare(
          `SELECT m.*, u.nombre as user_nombre
           FROM memberships m
           LEFT JOIN users u ON lower(u.email) = lower(m.user_email)
           WHERE m.estado = 'Activa' AND m.fecha_fin >= ? AND m.fecha_fin <= ?`,
        )
        .all(hoyStr, limiteStr);

      if (filterEmail) {
        rows = rows.filter((r) => String(r.user_email).toLowerCase() === filterEmail);
      }

      const results = [];
      for (const r of rows) {
        const diffMs = new Date(r.fecha_fin).getTime() - new Date(hoyStr).getTime();
        const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const sent = await sendExpiryNotification({
          correo: r.user_email,
          nombre: r.user_nombre || 'Socio',
          planNombre: r.plan_nombre,
          fechaFin: r.fecha_fin,
          diasRestantes,
        });
        results.push({ email: r.user_email, fechaFin: r.fecha_fin, diasRestantes, ...sent });
      }

      return res.json({ ok: true, notifiedCount: results.length, results });
    } catch (err) {
      console.error('Error en /api/admin/notify-expiring:', err);
      return res.status(500).json({ error: 'Error al enviar recordatorios de vencimiento' });
    }
  });

  return router;
}
