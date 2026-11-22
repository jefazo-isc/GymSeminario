import crypto from 'node:crypto';
import express from 'express';
import db, { todayIso } from '../services/db.js';
import { authGuard, isStaffRole } from '../middleware/auth.middleware.js';

export function computeImcAndAlerts({ peso, altura, grasaCorporal, restriccionesMedicas }) {
  const pesoNum = Number(peso);
  const rawAltura = Number(altura);
  const alturaM = rawAltura > 0 && rawAltura < 3 ? rawAltura : rawAltura / 100;

  let imc = 0;
  if (Number.isFinite(pesoNum) && pesoNum > 0 && Number.isFinite(alturaM) && alturaM > 0) {
    imc = Number((pesoNum / (alturaM * alturaM)).toFixed(2));
  }

  const healthAlerts = [];
  if (imc > 0 && imc < 18.5) {
    healthAlerts.push({
      nivel: 'warning',
      codigo: 'BAJO_PESO',
      mensaje: `IMC de ${imc} (bajo peso). Se sugiere plan de superávit calórico supervisado.`,
    });
  } else if (imc >= 25 && imc < 30) {
    healthAlerts.push({
      nivel: 'info',
      codigo: 'SOBREPESO',
      mensaje: `IMC de ${imc} (sobrepeso moderado). Prioriza progresión gradual y control metabólico.`,
    });
  } else if (imc >= 30) {
    healthAlerts.push({
      nivel: 'warning',
      codigo: 'IMC_ELEVADO',
      mensaje: `IMC de ${imc}. Evita alto impacto articular inicial y prioriza bajo impacto guiado.`,
    });
  }

  const grasa = Number(grasaCorporal);
  if (Number.isFinite(grasa) && grasa >= 32) {
    healthAlerts.push({
      nivel: 'info',
      codigo: 'GRASA_ALTA',
      mensaje: `Grasa corporal registrada de ${grasa}%. Recomendamos monitoreo quincenal.`,
    });
  }

  const rest = String(restriccionesMedicas || '').trim();
  if (rest && !['ninguna', 'ninguno', 'none', 'n/a', 'no'].includes(rest.toLowerCase())) {
    healthAlerts.push({
      nivel: 'danger',
      codigo: 'RESTRICCION_MEDICA',
      mensaje: `Restricción médica declarada: ${rest}. Ajustar cargas y notificar al entrenador.`,
    });
  }

  return { imc, healthAlerts };
}

function resolveTargetEmail(req) {
  const requested = String(req.query.email || req.body?.userEmail || req.body?.email || '')
    .toLowerCase()
    .trim();
  if (requested && isStaffRole(req.user)) {
    return requested;
  }
  return req.user.email;
}

export function createProfileRouter() {
  const router = express.Router();

  router.get('/api/profile', authGuard, (req, res) => {
    try {
      const targetEmail = resolveTargetEmail(req);
      const profile = db.prepare('SELECT * FROM user_profiles WHERE lower(user_email) = lower(?)').get(targetEmail);
      const user = db.prepare('SELECT id, email, nombre, role FROM users WHERE lower(email) = lower(?)').get(targetEmail);
      const latestMeasurement = db
        .prepare(
          'SELECT * FROM body_measurements WHERE lower(user_email) = lower(?) ORDER BY fecha DESC, datetime(created_at) DESC LIMIT 1',
        )
        .get(targetEmail);

      const peso = latestMeasurement?.peso ?? profile?.peso ?? null;
      const altura = latestMeasurement?.altura ?? profile?.altura ?? null;
      const restriccionesMedicas =
        profile?.restricciones_medicas || latestMeasurement?.restricciones_medicas || 'Ninguna';
      const { imc, healthAlerts } = computeImcAndAlerts({
        peso,
        altura,
        grasaCorporal: latestMeasurement?.grasa_corporal,
        restriccionesMedicas,
      });

      return res.json({
        userEmail: targetEmail,
        nombre: profile?.nombre || user?.nombre || '',
        telefono: profile?.telefono || '',
        edad: profile?.edad ?? null,
        genero: profile?.genero || '',
        objetivo: profile?.objetivo || '',
        nivel: profile?.nivel || 'Intermedio',
        diasDisponibles: profile?.dias_disponibles ?? 4,
        peso,
        altura,
        restriccionesMedicas,
        contactoEmergencia: profile?.contacto_emergencia || '',
        imc,
        healthAlerts,
        latestMeasurement: latestMeasurement || null,
      });
    } catch (err) {
      console.error('Error en GET /api/profile:', err);
      return res.status(500).json({ error: 'Error al consultar perfil.' });
    }
  });

  router.put('/api/profile', authGuard, (req, res) => {
    try {
      const targetEmail = resolveTargetEmail(req);
      const b = req.body || {};
      const restricciones = b.restriccionesMedicas ?? b.restricciones_medicas ?? 'Ninguna';
      const diasDisp = b.diasDisponibles ?? b.dias_disponibles ?? 4;
      const contacto = b.contactoEmergencia ?? b.contacto_emergencia ?? '';

      db.prepare(`
        INSERT INTO user_profiles (
          user_email, nombre, telefono, edad, genero, objetivo, nivel, dias_disponibles, peso, altura, restricciones_medicas, contacto_emergencia, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_email) DO UPDATE SET
          nombre = COALESCE(excluded.nombre, user_profiles.nombre),
          telefono = COALESCE(excluded.telefono, user_profiles.telefono),
          edad = COALESCE(excluded.edad, user_profiles.edad),
          genero = COALESCE(excluded.genero, user_profiles.genero),
          objetivo = COALESCE(excluded.objetivo, user_profiles.objetivo),
          nivel = COALESCE(excluded.nivel, user_profiles.nivel),
          dias_disponibles = COALESCE(excluded.dias_disponibles, user_profiles.dias_disponibles),
          peso = COALESCE(excluded.peso, user_profiles.peso),
          altura = COALESCE(excluded.altura, user_profiles.altura),
          restricciones_medicas = COALESCE(excluded.restricciones_medicas, user_profiles.restricciones_medicas),
          contacto_emergencia = COALESCE(excluded.contacto_emergencia, user_profiles.contacto_emergencia),
          updated_at = datetime('now')
      `).run(
        targetEmail,
        b.nombre ?? null,
        b.telefono ?? null,
        b.edad !== undefined ? Number(b.edad) : null,
        b.genero ?? null,
        b.objetivo ?? null,
        b.nivel ?? null,
        Number(diasDisp),
        b.peso !== undefined ? Number(b.peso) : null,
        b.altura !== undefined ? Number(b.altura) : null,
        restricciones,
        contacto,
      );

      const saved = db.prepare('SELECT * FROM user_profiles WHERE lower(user_email) = lower(?)').get(targetEmail);
      const { imc, healthAlerts } = computeImcAndAlerts({
        peso: saved.peso,
        altura: saved.altura,
        restriccionesMedicas: saved.restricciones_medicas,
      });

      return res.json({
        ok: true,
        profile: {
          userEmail: saved.user_email,
          nombre: saved.nombre,
          telefono: saved.telefono,
          edad: saved.edad,
          genero: saved.genero,
          objetivo: saved.objetivo,
          nivel: saved.nivel,
          diasDisponibles: saved.dias_disponibles,
          peso: saved.peso,
          altura: saved.altura,
          restriccionesMedicas: saved.restricciones_medicas,
          contactoEmergencia: saved.contacto_emergencia,
        },
        imc,
        healthAlerts,
      });
    } catch (err) {
      console.error('Error en PUT /api/profile:', err);
      return res.status(500).json({ error: 'Error al actualizar perfil.' });
    }
  });

  router.get('/api/profile/measurements', authGuard, (req, res) => {
    try {
      const targetEmail = resolveTargetEmail(req);
      const rows = db
        .prepare(
          'SELECT * FROM body_measurements WHERE lower(user_email) = lower(?) ORDER BY fecha DESC, datetime(created_at) DESC',
        )
        .all(targetEmail);
      return res.json(rows);
    } catch (err) {
      console.error('Error en GET /api/profile/measurements:', err);
      return res.status(500).json({ error: 'Error al consultar mediciones.' });
    }
  });

  router.post('/api/profile/measurements', authGuard, (req, res) => {
    try {
      const targetEmail = resolveTargetEmail(req);
      const b = req.body || {};
      const peso = Number(b.peso);
      const altura = Number(b.altura);

      if (!Number.isFinite(peso) || peso <= 0 || !Number.isFinite(altura) || altura <= 0) {
        return res.status(400).json({ error: 'Peso y altura válidos son requeridos.' });
      }

      const grasaCorporal = b.grasaCorporal ?? b.grasa_corporal ?? null;
      const restriccionesMedicas = b.restriccionesMedicas ?? b.restricciones_medicas ?? null;
      const { imc, healthAlerts } = computeImcAndAlerts({
        peso,
        altura,
        grasaCorporal,
        restriccionesMedicas,
      });

      const id = `BM-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
      const fecha = String(b.fecha || todayIso()).trim();

      db.transaction(() => {
        db.prepare(`
          INSERT INTO body_measurements (
            id, user_email, fecha, peso, altura, imc, cintura, pecho, brazo, grasa_corporal, restricciones_medicas, notas
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          targetEmail,
          fecha,
          peso,
          altura,
          imc,
          b.cintura !== undefined ? Number(b.cintura) : null,
          b.pecho !== undefined ? Number(b.pecho) : null,
          b.brazo !== undefined ? Number(b.brazo) : null,
          grasaCorporal !== null && grasaCorporal !== undefined ? Number(grasaCorporal) : null,
          restriccionesMedicas,
          b.notas ?? null,
        );

        db.prepare(`
          INSERT INTO user_profiles (user_email, peso, altura, restricciones_medicas, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'))
          ON CONFLICT(user_email) DO UPDATE SET
            peso = excluded.peso,
            altura = excluded.altura,
            restricciones_medicas = COALESCE(excluded.restricciones_medicas, user_profiles.restricciones_medicas),
            updated_at = datetime('now')
        `).run(targetEmail, peso, altura, restriccionesMedicas);
      })();

      const measurement = db.prepare('SELECT * FROM body_measurements WHERE id = ?').get(id);
      return res.status(201).json({ ok: true, measurement, imc, healthAlerts });
    } catch (err) {
      console.error('Error en POST /api/profile/measurements:', err);
      return res.status(500).json({ error: 'Error al registrar medición.' });
    }
  });

  return router;
}
