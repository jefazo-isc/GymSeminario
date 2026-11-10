import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '../edge_gym.db');
const db = new Database(dbPath);

// Configuración de alto rendimiento para memoria flash (WAL mode)
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Inicializar tablas esenciales para el nodo Edge
db.exec(`
  CREATE TABLE IF NOT EXISTS user_quotas (
    uid TEXT PRIMARY KEY,
    email TEXT,
    consultas_hoy INTEGER DEFAULT 0,
    ultimo_acceso TEXT
  );

  CREATE TABLE IF NOT EXISTS asistencias_edge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    codigo_qr TEXT,
    timestamp TEXT NOT NULL,
    sincronizado INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS ia_cache (
    prompt_hash TEXT PRIMARY KEY,
    respuesta TEXT NOT NULL,
    creado_en TEXT NOT NULL
  );
`);

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

export default db;
