import db from './db.js';

const MAX_CONSULTAS_DIARIAS = parseInt(process.env.MAX_AI_QUOTA || '15', 10);

export function verificarYActualizarCuota(uid, email) {
  if (!uid) {
    return { permitida: false, restantes: 0, error: 'UID de usuario requerido' };
  }
  const safeUid = String(uid).trim();
  if (!safeUid) {
    return { permitida: false, restantes: 0, error: 'UID de usuario inválido' };
  }
  const safeEmail = email ? String(email).trim() : 'desconocido';
  const hoy = new Date().toISOString().slice(0, 10);
  const row = db.prepare('SELECT * FROM user_quotas WHERE uid = ?').get(safeUid);

  if (!row) {
    db.prepare(`
      INSERT INTO user_quotas (uid, email, consultas_hoy, ultimo_acceso)
      VALUES (?, ?, 1, ?)
    `).run(safeUid, safeEmail, hoy);
    return { permitida: true, restantes: MAX_CONSULTAS_DIARIAS - 1 };
  }

  if (row.ultimo_acceso !== hoy) {
    db.prepare(`
      UPDATE user_quotas
      SET consultas_hoy = 1, ultimo_acceso = ?
      WHERE uid = ?
    `).run(hoy, safeUid);
    return { permitida: true, restantes: MAX_CONSULTAS_DIARIAS - 1 };
  }

  if (row.consultas_hoy >= MAX_CONSULTAS_DIARIAS) {
    return { permitida: false, restantes: 0 };
  }

  db.prepare(`
    UPDATE user_quotas
    SET consultas_hoy = consultas_hoy + 1
    WHERE uid = ?
  `).run(safeUid);

  return { permitida: true, restantes: MAX_CONSULTAS_DIARIAS - (row.consultas_hoy + 1) };
}

export function registrarAsistenciaEdge(uid, codigoQr) {
  if (!uid || !codigoQr) {
    throw new Error('UID y código QR requeridos para registrar asistencia Edge');
  }
  const ahora = new Date().toISOString();
  return db.prepare(`
    INSERT INTO asistencias_edge (uid, codigo_qr, timestamp, sincronizado)
    VALUES (?, ?, ?, 0)
  `).run(String(uid).trim(), String(codigoQr).trim(), ahora);
}

export function getIaCache(promptHash, ttlMs) {
  const row = db.prepare('SELECT respuesta, creado_en FROM ia_cache WHERE prompt_hash = ?').get(promptHash);
  if (!row) return null;
  const age = Date.now() - new Date(row.creado_en).getTime();
  if (!Number.isFinite(age) || age > ttlMs) {
    db.prepare('DELETE FROM ia_cache WHERE prompt_hash = ?').run(promptHash);
    return null;
  }
  try {
    return JSON.parse(row.respuesta);
  } catch {
    return null;
  }
}

export function setIaCache(promptHash, data) {
  db.prepare(`
    INSERT INTO ia_cache (prompt_hash, respuesta, creado_en)
    VALUES (?, ?, ?)
    ON CONFLICT(prompt_hash) DO UPDATE SET
      respuesta = excluded.respuesta,
      creado_en = excluded.creado_en
  `).run(promptHash, JSON.stringify(data), new Date().toISOString());
}

export default db;
