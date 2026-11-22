import crypto from 'node:crypto';
import express from 'express';
import db, { todayIso } from '../services/db.js';
import {
  authGuard,
  optionalAuth,
  requireRole,
  isPureReceptionRole,
  isStaffRole,
} from '../middleware/auth.middleware.js';

function blockPureReception(req, res, next) {
  if (isPureReceptionRole(req.user)) {
    return res.status(403).json({
      error: 'El rol de recepción no tiene acceso a bitácora o rutinas de entrenamiento.',
    });
  }
  return next();
}

const DISCIPLINES = ['Boxeo', 'Crossfit', 'Spinning', 'Yoga', 'Pesas'];
const SHIFTS = ['Matutino', 'Vespertino', 'Nocturno'];
const MAX_CAPACITY_PER_SLOT = 20;

export function createTrainingRouter() {
  const router = express.Router();

  // ── Bookings CRUD ───────────────────────────────────────────────────────────
  router.post(['/api/bookings', '/bookings'], optionalAuth, (req, res) => {
    try {
      const { id, entrenamiento, fecha, turno, usuario, email, nombre, telefono } = req.body || {};
      if (!entrenamiento || !fecha || !turno) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: entrenamiento, fecha, turno' });
      }
      const bookingId = id || `bk-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
      const resolvedEmail = req.user?.email || email || null;
      db.prepare(`
        INSERT INTO bookings (id, usuario, email, nombre, entrenamiento, fecha, turno, telefono, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Confirmada')
      `).run(
        bookingId,
        usuario ? String(usuario) : req.user?.uid ? String(req.user.uid) : null,
        resolvedEmail,
        nombre || req.user?.nombre || null,
        String(entrenamiento).trim(),
        String(fecha).trim(),
        String(turno).trim(),
        telefono || null,
      );
      return res.status(201).json({ id: bookingId, mensaje: 'Reserva registrada exitosamente en SQLite' });
    } catch (err) {
      console.error('Error al registrar reserva:', err);
      return res.status(500).json({ error: 'Error al registrar la reserva en base de datos' });
    }
  });

  router.get(['/api/bookings', '/bookings'], optionalAuth, (req, res) => {
    try {
      const emailFilter = req.query.email ? String(req.query.email).toLowerCase().trim() : '';
      const rows = emailFilter
        ? db.prepare('SELECT * FROM bookings WHERE lower(email) = lower(?) ORDER BY created_at DESC').all(emailFilter)
        : db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
      return res.json(rows);
    } catch (err) {
      console.error('Error al listar reservas:', err);
      return res.status(500).json({ error: 'Error al obtener reservas' });
    }
  });

  router.put(['/api/bookings/:id', '/bookings/:id'], authGuard, (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }
      const ownerMatch = existing.email && String(existing.email).toLowerCase() === req.user.email;
      if (!ownerMatch && !isStaffRole(req.user)) {
        return res.status(403).json({ error: 'No autorizado para editar esta reserva.' });
      }

      const b = req.body || {};
      db.prepare(`
        UPDATE bookings SET
          entrenamiento = ?,
          fecha = ?,
          turno = ?,
          nombre = ?,
          telefono = ?,
          estado = ?
        WHERE id = ?
      `).run(
        String(b.entrenamiento || existing.entrenamiento).trim(),
        String(b.fecha || existing.fecha).trim(),
        String(b.turno || existing.turno).trim(),
        b.nombre !== undefined ? b.nombre : existing.nombre,
        b.telefono !== undefined ? b.telefono : existing.telefono,
        b.estado || existing.estado || 'Confirmada',
        req.params.id,
      );

      const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
      return res.json({ ok: true, booking: updated });
    } catch (err) {
      console.error('Error actualizando reserva:', err);
      return res.status(500).json({ error: 'Error al actualizar reserva' });
    }
  });

  router.delete(['/api/bookings/:id', '/bookings/:id'], authGuard, (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }
      const ownerMatch = existing.email && String(existing.email).toLowerCase() === req.user.email;
      if (!ownerMatch && !isStaffRole(req.user)) {
        return res.status(403).json({ error: 'No autorizado para cancelar esta reserva.' });
      }
      db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
      return res.json({ ok: true, id: req.params.id, mensaje: 'Reserva eliminada' });
    } catch (err) {
      console.error('Error eliminando reserva:', err);
      return res.status(500).json({ error: 'Error al eliminar reserva' });
    }
  });

  // ── Attendances CRUD ────────────────────────────────────────────────────────
  router.post(['/api/attendances', '/attendances'], (req, res) => {
    try {
      const { id, clase, fecha, hora, usuario, email, nombre } = req.body || {};
      if (!clase || !fecha || !hora) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: clase, fecha, hora' });
      }
      const attId = id || `att-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
      db.prepare(`
        INSERT INTO attendances (id, usuario, email, nombre, clase, fecha, hora)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        attId,
        usuario ? String(usuario) : null,
        email || null,
        nombre || null,
        String(clase).trim(),
        String(fecha).trim(),
        String(hora).trim(),
      );
      return res.status(201).json({ id: attId, mensaje: 'Asistencia registrada exitosamente en SQLite' });
    } catch (err) {
      console.error('Error al registrar asistencia:', err);
      return res.status(500).json({ error: 'Error al registrar asistencia' });
    }
  });

  router.get(['/api/attendances', '/attendances'], (req, res) => {
    try {
      const emailFilter = req.query.email ? String(req.query.email).toLowerCase().trim() : '';
      const rows = emailFilter
        ? db.prepare('SELECT * FROM attendances WHERE lower(email) = lower(?) ORDER BY created_at DESC').all(emailFilter)
        : db.prepare('SELECT * FROM attendances ORDER BY created_at DESC').all();
      return res.json(rows);
    } catch (err) {
      console.error('Error al listar asistencias:', err);
      return res.status(500).json({ error: 'Error al obtener asistencias' });
    }
  });

  router.put(['/api/attendances/:id', '/attendances/:id'], authGuard, requireRole('admin', 'reception', 'trainer'), (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM attendances WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Asistencia no encontrada' });
      }
      const b = req.body || {};
      db.prepare(`
        UPDATE attendances SET clase = ?, fecha = ?, hora = ?, nombre = ? WHERE id = ?
      `).run(
        String(b.clase || existing.clase).trim(),
        String(b.fecha || existing.fecha).trim(),
        String(b.hora || existing.hora).trim(),
        b.nombre !== undefined ? b.nombre : existing.nombre,
        req.params.id,
      );
      const updated = db.prepare('SELECT * FROM attendances WHERE id = ?').get(req.params.id);
      return res.json({ ok: true, attendance: updated });
    } catch (err) {
      console.error('Error actualizando asistencia:', err);
      return res.status(500).json({ error: 'Error al actualizar asistencia' });
    }
  });

  router.delete(['/api/attendances/:id', '/attendances/:id'], authGuard, requireRole('admin', 'reception', 'trainer'), (req, res) => {
    try {
      const result = db.prepare('DELETE FROM attendances WHERE id = ?').run(req.params.id);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Asistencia no encontrada' });
      }
      return res.json({ ok: true, id: req.params.id, mensaje: 'Asistencia eliminada' });
    } catch (err) {
      console.error('Error eliminando asistencia:', err);
      return res.status(500).json({ error: 'Error al eliminar asistencia' });
    }
  });

  // ── Availability, Live Floor, Enriched Stats & AI Forecast ─────────────────
  router.get(['/api/sessions/availability', '/sessions/availability'], (req, res) => {
    try {
      const fecha = String(req.query.fecha || todayIso()).trim();
      const rows = db
        .prepare(
          `SELECT entrenamiento, turno, COUNT(*) as reservados
           FROM bookings
           WHERE fecha = ? AND estado != 'Cancelada'
           GROUP BY entrenamiento, turno`,
        )
        .all(fecha);

      const slots = [];
      for (const discipline of DISCIPLINES) {
        for (const shift of SHIFTS) {
          const match = rows.find(
            (r) =>
              String(r.entrenamiento).toLowerCase() === discipline.toLowerCase() &&
              String(r.turno).toLowerCase() === shift.toLowerCase(),
          );
          const reservados = match ? Number(match.reservados) : 0;
          slots.push({
            disciplina: discipline,
            fecha,
            turno: shift,
            capacidad: MAX_CAPACITY_PER_SLOT,
            reservados,
            disponibles: Math.max(0, MAX_CAPACITY_PER_SLOT - reservados),
          });
        }
      }
      return res.json({ fecha, capacidadPorTurno: MAX_CAPACITY_PER_SLOT, slots });
    } catch (err) {
      console.error('Error en /api/sessions/availability:', err);
      return res.status(500).json({ error: 'Error al consultar disponibilidad.' });
    }
  });

  router.get(['/api/sessions/live', '/sessions/live'], authGuard, requireRole('admin', 'reception', 'trainer'), (req, res) => {
    try {
      const fecha = String(req.query.fecha || todayIso()).trim();
      const attendancesToday = db
        .prepare('SELECT * FROM attendances WHERE fecha = ? ORDER BY hora DESC, datetime(created_at) DESC')
        .all(fecha);
      const bookingsToday = db
        .prepare("SELECT * FROM bookings WHERE fecha = ? AND estado != 'Cancelada' ORDER BY created_at DESC")
        .all(fecha);

      return res.json({
        fecha,
        liveOccupancy: attendancesToday.length,
        scheduledToday: bookingsToday.length,
        attendances: attendancesToday,
        bookings: bookingsToday,
      });
    } catch (err) {
      console.error('Error en /api/sessions/live:', err);
      return res.status(500).json({ error: 'Error al consultar sesiones en vivo.' });
    }
  });

  router.get(['/api/sessions/stats', '/sessions/stats'], (_req, res) => {
    try {
      const bookingRows = db
        .prepare('SELECT entrenamiento, COUNT(*) as total FROM bookings GROUP BY entrenamiento')
        .all();
      const attendanceRows = db
        .prepare('SELECT clase, COUNT(*) as total FROM attendances GROUP BY clase')
        .all();
      const shiftRows = db
        .prepare('SELECT turno, COUNT(*) as total FROM bookings GROUP BY turno')
        .all();

      const stats = { Boxeo: 0, Crossfit: 0, Spinning: 0, Yoga: 0, Pesas: 0 };
      const attendancesByDiscipline = { Boxeo: 0, Crossfit: 0, Spinning: 0, Yoga: 0, Pesas: 0 };

      for (const row of bookingRows) {
        const match = Object.keys(stats).find((k) => k.toLowerCase() === (row.entrenamiento || '').toLowerCase());
        if (match) stats[match] = row.total;
        else if (row.entrenamiento) stats[row.entrenamiento] = row.total;
      }

      for (const row of attendanceRows) {
        const match = Object.keys(attendancesByDiscipline).find(
          (k) => k.toLowerCase() === (row.clase || '').toLowerCase(),
        );
        if (match) attendancesByDiscipline[match] = row.total;
        else if (row.clase) attendancesByDiscipline[row.clase] = row.total;
      }

      const hourlyOccupancy = { Matutino: 0, Vespertino: 0, Nocturno: 0 };
      for (const row of shiftRows) {
        const key = Object.keys(hourlyOccupancy).find((k) => k.toLowerCase() === (row.turno || '').toLowerCase());
        if (key) hourlyOccupancy[key] = row.total;
      }

      const activeMemberships = db
        .prepare("SELECT COUNT(*) as total FROM memberships WHERE estado = 'Activa' AND fecha_fin >= ?")
        .get(todayIso())?.total || 0;
      const totalRevenue =
        db.prepare("SELECT COALESCE(SUM(monto), 0) as total FROM stripe_transactions WHERE estado = 'COMPLETED'").get()
          ?.total || 0;
      const totalBookings = db.prepare('SELECT COUNT(*) as total FROM bookings').get()?.total || 0;
      const totalAttendances = db.prepare('SELECT COUNT(*) as total FROM attendances').get()?.total || 0;

      return res.json({
        ...stats,
        attendancesByDiscipline,
        hourlyOccupancy,
        totalBookings,
        totalAttendances,
        activeMemberships,
        totalRevenue: Number(Number(totalRevenue).toFixed(2)),
      });
    } catch (err) {
      console.error('Error al calcular estadísticas en /api/sessions/stats:', err);
      return res.status(500).json({ error: 'Error al obtener estadísticas del servidor' });
    }
  });

  router.get(['/api/analytics/forecast', '/analytics/forecast'], authGuard, requireRole('admin'), (_req, res) => {
    try {
      const shiftRows = db.prepare('SELECT turno, COUNT(*) as total FROM bookings GROUP BY turno').all();
      const attHours = db.prepare('SELECT hora, COUNT(*) as total FROM attendances GROUP BY substr(hora, 1, 2)').all();
      const discRows = db
        .prepare('SELECT entrenamiento, COUNT(*) as total FROM bookings GROUP BY entrenamiento ORDER BY total DESC')
        .all();

      const shiftCounts = { Matutino: 0, Vespertino: 0, Nocturno: 0 };
      for (const r of shiftRows) {
        const match = Object.keys(shiftCounts).find((k) => k.toLowerCase() === String(r.turno).toLowerCase());
        if (match) shiftCounts[match] = Number(r.total);
      }

      const sortedShifts = Object.entries(shiftCounts).sort((a, b) => b[1] - a[1]);
      const peakShift = sortedShifts[0]?.[0] || 'Vespertino';
      const peakHourWindow =
        peakShift === 'Matutino'
          ? '07:00 - 09:30'
          : peakShift === 'Nocturno'
            ? '19:30 - 21:30'
            : '17:00 - 20:00';
      const cleaningWindow =
        peakShift === 'Matutino' ? '11:30 - 12:30 y 22:00' : '14:00 - 15:30 y 21:45';

      return res.json({
        generatedAt: new Date().toISOString(),
        source: 'deterministic-analytics',
        peakShift,
        peakHourWindow,
        topDiscipline: discRows[0]?.entrenamiento || 'Boxeo',
        shiftDistribution: shiftCounts,
        hourlyCheckins: attHours,
        staffingRecommendation: `Asignar 2 entrenadores de piso y 1 auxiliar de recepción durante el bloque pico (${peakHourWindow}, turno ${peakShift}).`,
        cleaningRecommendation: `Programar desinfección profunda de racks, colchonetas y área de cardio en la ventana valle (${cleaningWindow}).`,
      });
    } catch (err) {
      console.error('Error en /api/analytics/forecast:', err);
      return res.status(500).json({ error: 'Error al calcular predicción de aforo.' });
    }
  });

  // ── Workout Progress Log (Bitácora de Progreso) ────────────────────────────
  router.get('/api/workout-logs', authGuard, blockPureReception, (req, res) => {
    try {
      const requested = req.query.email ? String(req.query.email).toLowerCase().trim() : '';
      const targetEmail = requested && isStaffRole(req.user) ? requested : req.user.email;
      const rows = db
        .prepare('SELECT * FROM workout_logs WHERE lower(user_email) = lower(?) ORDER BY fecha DESC, datetime(created_at) DESC')
        .all(targetEmail);
      return res.json(rows);
    } catch (err) {
      console.error('Error en GET /api/workout-logs:', err);
      return res.status(500).json({ error: 'Error al consultar bitácora.' });
    }
  });

  router.post('/api/workout-logs', authGuard, blockPureReception, (req, res) => {
    try {
      const b = req.body || {};
      if (!b.ejercicio || !String(b.ejercicio).trim()) {
        return res.status(400).json({ error: 'El nombre del ejercicio es obligatorio.' });
      }
      const targetEmail =
        b.userEmail && isStaffRole(req.user) ? String(b.userEmail).toLowerCase().trim() : req.user.email;
      const id = `WL-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
      const fecha = String(b.fecha || todayIso()).trim();

      db.prepare(`
        INSERT INTO workout_logs (
          id, user_email, fecha, ejercicio, grupo_muscular, series, repeticiones, peso_kg, rpe, notas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        targetEmail,
        fecha,
        String(b.ejercicio).trim(),
        String(b.grupoMuscular || b.grupo_muscular || 'General').trim(),
        Math.max(1, Number(b.series || 3)),
        String(b.repeticiones || '10').trim(),
        Math.max(0, Number(b.pesoKg ?? b.peso_kg ?? 0)),
        b.rpe !== undefined && b.rpe !== null ? Number(b.rpe) : null,
        b.notas ?? null,
      );

      const created = db.prepare('SELECT * FROM workout_logs WHERE id = ?').get(id);
      return res.status(201).json({ ok: true, log: created });
    } catch (err) {
      console.error('Error en POST /api/workout-logs:', err);
      return res.status(500).json({ error: 'Error al registrar entrenamiento.' });
    }
  });

  router.delete('/api/workout-logs/:id', authGuard, blockPureReception, (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM workout_logs WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Registro no encontrado.' });
      }
      if (existing.user_email.toLowerCase() !== req.user.email && !isStaffRole(req.user)) {
        return res.status(403).json({ error: 'No autorizado para eliminar este registro.' });
      }
      db.prepare('DELETE FROM workout_logs WHERE id = ?').run(req.params.id);
      return res.json({ ok: true, id: req.params.id });
    } catch (err) {
      console.error('Error en DELETE /api/workout-logs/:id:', err);
      return res.status(500).json({ error: 'Error al eliminar registro.' });
    }
  });

  // ── Persisted & Trainer-Assigned Routines ──────────────────────────────────
  router.get('/api/routines', authGuard, blockPureReception, (req, res) => {
    try {
      const requested = req.query.email ? String(req.query.email).toLowerCase().trim() : '';
      const targetEmail = requested && isStaffRole(req.user) ? requested : req.user.email;
      const rows = db
        .prepare('SELECT * FROM assigned_routines WHERE lower(user_email) = lower(?) ORDER BY activa DESC, datetime(updated_at) DESC')
        .all(targetEmail);
      const mapped = rows.map((r) => ({
        id: r.id,
        userEmail: r.user_email,
        assignedBy: r.assigned_by,
        titulo: r.titulo,
        objetivo: r.objetivo,
        nivel: r.nivel,
        origen: r.origen,
        activa: Boolean(r.activa),
        rutina: JSON.parse(r.rutina_json || '{}'),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      return res.json(mapped);
    } catch (err) {
      console.error('Error en GET /api/routines:', err);
      return res.status(500).json({ error: 'Error al consultar rutinas.' });
    }
  });

  router.post('/api/routines', authGuard, blockPureReception, (req, res) => {
    try {
      const b = req.body || {};
      const requestedEmail = String(b.userEmail || b.email || req.user.email).toLowerCase().trim();
      if (requestedEmail !== req.user.email && !isStaffRole(req.user)) {
        return res.status(403).json({ error: 'Solo entrenadores o administradores pueden asignar rutinas a otros socios.' });
      }

      const rutinaObj = b.rutina || b.data || b;
      const titulo = String(b.titulo || rutinaObj?.tituloRutina || 'Rutina Personalizada').trim();
      if (!rutinaObj || typeof rutinaObj !== 'object') {
        return res.status(400).json({ error: 'Estructura de rutina requerida.' });
      }

      const id = `RT-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
      const activa = b.activa === false ? 0 : 1;

      db.transaction(() => {
        if (activa === 1) {
          db.prepare('UPDATE assigned_routines SET activa = 0 WHERE lower(user_email) = lower(?)').run(requestedEmail);
        }
        db.prepare(`
          INSERT INTO assigned_routines (
            id, user_email, assigned_by, titulo, objetivo, nivel, origen, rutina_json, activa, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          id,
          requestedEmail,
          req.user.email,
          titulo,
          b.objetivo || rutinaObj?.objetivo || 'Acondicionamiento físico',
          b.nivel || rutinaObj?.nivelRecomendado || 'Intermedio',
          b.origen || (requestedEmail !== req.user.email ? 'trainer' : 'ia'),
          JSON.stringify(rutinaObj),
          activa,
        );
      })();

      return res.status(201).json({
        ok: true,
        routine: {
          id,
          userEmail: requestedEmail,
          assignedBy: req.user.email,
          titulo,
          activa: Boolean(activa),
          rutina: rutinaObj,
        },
      });
    } catch (err) {
      console.error('Error en POST /api/routines:', err);
      return res.status(500).json({ error: 'Error al guardar rutina.' });
    }
  });

  router.put('/api/routines/:id', authGuard, blockPureReception, (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM assigned_routines WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Rutina no encontrada.' });
      }
      if (existing.user_email.toLowerCase() !== req.user.email && !isStaffRole(req.user)) {
        return res.status(403).json({ error: 'No autorizado para editar esta rutina.' });
      }
      const b = req.body || {};
      const nextRutina = b.rutina || b.data;
      const nextJson = nextRutina ? JSON.stringify(nextRutina) : existing.rutina_json;
      const nextActiva = b.activa !== undefined ? (b.activa ? 1 : 0) : existing.activa;

      db.prepare(`
        UPDATE assigned_routines SET
          titulo = ?,
          objetivo = ?,
          nivel = ?,
          rutina_json = ?,
          activa = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        String(b.titulo || existing.titulo).trim(),
        b.objetivo ?? existing.objetivo,
        b.nivel ?? existing.nivel,
        nextJson,
        nextActiva,
        req.params.id,
      );

      return res.json({ ok: true, id: req.params.id, mensaje: 'Rutina actualizada' });
    } catch (err) {
      console.error('Error en PUT /api/routines/:id:', err);
      return res.status(500).json({ error: 'Error al actualizar rutina.' });
    }
  });

  return router;
}
