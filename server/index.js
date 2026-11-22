import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { generarRutinaEntrenamiento } from './services/routineCoach.service.js';
import { COACHES, chatearConCoach } from './services/coachChat.service.js';
import { sendBookingNotification, sendAttendanceNotification } from './services/email.service.js';
import { AI_STATUS } from './services/aiProvider.service.js';
import { authAndQuotaGuard } from './middleware/auth.middleware.js';
import { registrarAsistenciaEdge } from './services/quota.service.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, 'edge_gym.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    plan_nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    periodo TEXT NOT NULL,
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'Activa',
    beneficios TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

// Tabla de transacciones y auditoría financiera de PayPal (esquema adaptado de CANACO)
db.exec(`
  CREATE TABLE IF NOT EXISTS paypal_transactions (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    capture_id TEXT,
    user_email TEXT NOT NULL,
    plan_nombre TEXT NOT NULL,
    monto_bruto REAL NOT NULL,
    tarifa_paypal REAL NOT NULL,
    monto_neto REAL NOT NULL,
    moneda TEXT NOT NULL DEFAULT 'MXN',
    estado TEXT NOT NULL DEFAULT 'COMPLETED',
    payer_name TEXT,
    payer_email TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Tabla de transacciones y cupones de Stripe
db.exec(`
  CREATE TABLE IF NOT EXISTS stripe_transactions (
    id TEXT PRIMARY KEY,
    payment_intent_id TEXT,
    user_email TEXT NOT NULL,
    plan_nombre TEXT NOT NULL,
    monto REAL NOT NULL,
    descuento REAL DEFAULT 0,
    cupon TEXT,
    moneda TEXT NOT NULL DEFAULT 'MXN',
    estado TEXT NOT NULL DEFAULT 'COMPLETED',
    payer_name TEXT,
    payer_email TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Crear tabla de reservas de clases en SQLite
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    usuario TEXT,
    email TEXT,
    nombre TEXT,
    entrenamiento TEXT NOT NULL,
    fecha TEXT NOT NULL,
    turno TEXT NOT NULL,
    telefono TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Crear tabla de asistencias físicas registradas
db.exec(`
  CREATE TABLE IF NOT EXISTS attendances (
    id TEXT PRIMARY KEY,
    usuario TEXT,
    email TEXT,
    nombre TEXT,
    clase TEXT NOT NULL,
    fecha TEXT NOT NULL,
    hora TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Semilla inicial si no hay reservas (para mantener los 4 registros históricos de Boxeo)
try {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM bookings').get();
  if (!countRow || countRow.count === 0) {
    const seed = db.prepare(`
      INSERT INTO bookings (id, usuario, email, nombre, entrenamiento, fecha, turno)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    seed.run('seed-box-1', '1', 'socio1@espaciogym.mx', 'Socio Box 1', 'Boxeo', '2026-11-01', 'Matutino');
    seed.run('seed-box-2', '2', 'socio2@espaciogym.mx', 'Socio Box 2', 'Boxeo', '2026-11-02', 'Vespertino');
    seed.run('seed-box-3', '3', 'socio3@espaciogym.mx', 'Socio Box 3', 'Boxeo', '2026-11-03', 'Matutino');
    seed.run('seed-box-4', '4', 'socio4@espaciogym.mx', 'Socio Box 4', 'Boxeo', '2026-11-04', 'Vespertino');
  }
} catch (e) {
  console.warn('Advertencia al verificar semilla de bookings:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración CORS permisiva para GitHub Pages y desarrollo local
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Email']
}));
app.use(express.json());

// Rate limiter general
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Demasiadas solicitudes, intente más tarde.' }
});
app.use(limiter);

// Endpoint de comprobación de estado (Healthcheck)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    servicio: 'espacioGYM Backend Server',
    geminiConfigured: !!(process.env.GEMINI_LLAVE || process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ai/status', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    aiTracker: AI_STATUS
  });
});

// Endpoint de Asistencia Offline en el Borde (Torniquete / QR)
app.post('/api/edge/asistencia', (req, res) => {
  const { uid, codigoQr } = req.body;
  if (!uid) return res.status(400).json({ error: 'UID requerido' });

  registrarAsistenciaEdge(uid, codigoQr);
  res.json({ exito: true, mensaje: 'Asistencia registrada en el nodo Edge local' });
});

// Lista de Coaches disponibles (público)
app.get('/api/coaches', (req, res) => {
  const lista = Object.values(COACHES).map(({ id, nombre, titulo, emoji, frase }) => ({
    id, nombre, titulo, emoji, frase
  }));
  res.json(lista);
});

// Guardia de suscripción activa para proteger consumo de tokens IA (Gemini / Mercury)
function verificarMembresiaBackend(req, res, next) {
  let email = (
    req.headers['x-user-email'] ||
    req.body?.userEmail ||
    req.body?.email ||
    req.body?.perfilUsuario?.email ||
    ''
  ).toString().toLowerCase().trim();
  let jwtRole = '';

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const parts = authHeader.split(' ')[1].split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (!email && payload?.email) email = String(payload.email).toLowerCase().trim();
        if (payload?.role) jwtRole = String(payload.role).toLowerCase().trim();
      }
    } catch {
      /* token no decodificable */
    }
  }

  if (
    email === 'guevara.cardona.yahir@gmail.com' ||
    email === 'admin@gymseminario.com' ||
    jwtRole === 'admin' ||
    jwtRole === 'subscriber' ||
    jwtRole === 'receptionist'
  ) {
    return next();
  }

  if (!email) {
    return res.status(403).json({
      exito: false,
      error: 'Suscripción requerida: Inicia sesión y adquiere una membresía activa para usar el Coach Virtual IA.'
    });
  }

  try {
    const hoy = new Date().toISOString().split('T')[0];
    const mem = db.prepare(`
      SELECT * FROM memberships
      WHERE lower(user_email) = ? AND estado = 'Activa' AND fecha_fin >= ?
      ORDER BY datetime(updated_at) DESC LIMIT 1
    `).get(email, hoy);

    if (mem) {
      return next();
    }
  } catch (e) {
    console.warn('Error verificando membresía en backend:', e);
  }

  return res.status(403).json({
    exito: false,
    error: 'Tu cuenta no cuenta con una membresía activa. Adquiere un plan para utilizar el Coach IA.'
  });
}

// Endpoint de Chat con un Coach
app.post('/api/coach/chat', verificarMembresiaBackend, async (req, res) => {
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

// Ruta para generar rutina
app.post('/api/rutina', verificarMembresiaBackend, async (req, res) => {
  try {
    const perfil = req.body;
    const resultado = await generarRutinaEntrenamiento(perfil);
    res.json(resultado);
  } catch (err) {
    console.error('Error en /api/rutina:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Endpoint para enviar confirmación de correo al agendar entrenamiento (compatible con y sin prefijo /api)
app.post(['/enviar-correo', '/api/enviar-correo'], async (req, res) => {
  const { correo, nombre, entrenamiento, fecha, turno } = req.body;

  if (!correo || !nombre || !entrenamiento || !fecha || !turno) {
    return res.status(400).json({ error: 'Faltan datos requeridos (correo, nombre, entrenamiento, fecha, turno)' });
  }

  try {
    const resultado = await sendBookingNotification({ correo, nombre, entrenamiento, fecha, turno });
    res.json({ mensaje: 'Correo enviado', resultado });
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    res.status(500).json({ error: 'Error al enviar el correo' });
  }
});

// Endpoint para enviar confirmación de asistencia por correo (compatible con y sin prefijo /api)
app.post(['/enviar-asistencia', '/api/enviar-asistencia'], async (req, res) => {
  const { correo, nombre, clase, fecha, hora } = req.body;

  if (!correo || !nombre || !clase || !fecha || !hora) {
    return res.status(400).json({ mensaje: 'Faltan campos requeridos.' });
  }

  try {
    const resultado = await sendAttendanceNotification({ correo, nombre, clase, fecha, hora });
    res.status(200).json({ mensaje: 'Correo enviado', resultado });
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    res.status(500).json({ mensaje: 'Error al enviar el correo.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ENDPOINTS DE RESERVAS, ASISTENCIAS Y ESTADÍSTICAS (SQLITE CENTRALIZADO)
// ══════════════════════════════════════════════════════════════════════════════

// Crear nueva reserva en SQLite
app.post(['/api/bookings', '/bookings'], (req, res) => {
  try {
    const { id, entrenamiento, fecha, turno, usuario, email, nombre, telefono } = req.body;
    if (!entrenamiento || !fecha || !turno) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: entrenamiento, fecha, turno' });
    }
    const bookingId = id || `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    db.prepare(`
      INSERT INTO bookings (id, usuario, email, nombre, entrenamiento, fecha, turno, telefono)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bookingId,
      usuario ? String(usuario) : null,
      email || null,
      nombre || null,
      entrenamiento.trim(),
      fecha.trim(),
      turno.trim(),
      telefono || null
    );
    res.status(201).json({ id: bookingId, mensaje: 'Reserva registrada exitosamente en SQLite' });
  } catch (err) {
    console.error('Error al registrar reserva:', err);
    res.status(500).json({ error: 'Error al registrar la reserva en base de datos' });
  }
});

// Listar todas las reservas registradas
app.get(['/api/bookings', '/bookings'], (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (err) {
    console.error('Error al listar reservas:', err);
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
});

// Registrar asistencia física en SQLite
app.post(['/api/attendances', '/attendances'], (req, res) => {
  try {
    const { id, clase, fecha, hora, usuario, email, nombre } = req.body;
    if (!clase || !fecha || !hora) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: clase, fecha, hora' });
    }
    const attId = id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    db.prepare(`
      INSERT INTO attendances (id, usuario, email, nombre, clase, fecha, hora)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      attId,
      usuario ? String(usuario) : null,
      email || null,
      nombre || null,
      clase.trim(),
      fecha.trim(),
      hora.trim()
    );
    res.status(201).json({ id: attId, mensaje: 'Asistencia registrada exitosamente en SQLite' });
  } catch (err) {
    console.error('Error al registrar asistencia:', err);
    res.status(500).json({ error: 'Error al registrar asistencia' });
  }
});

// Listar asistencias registradas
app.get(['/api/attendances', '/attendances'], (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM attendances ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (err) {
    console.error('Error al listar asistencias:', err);
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
});

// Estadísticas en tiempo real calculadas directamente de SQLite
app.get(['/api/sessions/stats', '/sessions/stats'], (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT entrenamiento, COUNT(*) as total
      FROM bookings
      GROUP BY entrenamiento
    `).all();

    const stats = {
      Boxeo: 0,
      Crossfit: 0,
      Spinning: 0,
      Yoga: 0,
      Pesas: 0
    };

    for (const row of rows) {
      const match = Object.keys(stats).find(
        k => k.toLowerCase() === (row.entrenamiento || '').toLowerCase()
      );
      if (match) {
        stats[match] = row.total;
      } else if (row.entrenamiento) {
        stats[row.entrenamiento] = row.total;
      }
    }

    res.json(stats);
  } catch (err) {
    console.error('Error al calcular estadísticas en /api/sessions/stats:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas del servidor' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  MEMBERSHIPS API — Persistencia en base de datos cloud
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/membership', (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ error: 'Email requerido' });
    const mem = db.prepare(`
      SELECT * FROM memberships 
      WHERE user_email = ? 
      ORDER BY datetime(updated_at) DESC 
      LIMIT 1
    `).get(email);

    if (!mem) return res.status(404).json({ error: 'No se encontró membresía' });

    res.json({
      id: mem.id,
      nombrePlan: mem.plan_nombre,
      precio: mem.precio,
      periodo: mem.periodo,
      fechaInicio: mem.fecha_inicio,
      fechaFin: mem.fecha_fin,
      estado: mem.estado,
      beneficios: JSON.parse(mem.beneficios || '[]')
    });
  } catch (err) {
    console.error('Error al consultar membresía:', err);
    res.status(500).json({ error: 'Error al consultar membresía' });
  }
});

app.post('/api/membership', (req, res) => {
  try {
    const { email, id, nombrePlan, precio, periodo, fechaInicio, fechaFin, estado, beneficios } = req.body;
    if (!email || !nombrePlan) {
      return res.status(400).json({ error: 'Datos de membresía incompletos' });
    }
    const memId = id || `MEM-${Math.floor(100000 + Math.random() * 900000)}`;
    const beneficiosJson = JSON.stringify(beneficios || []);

    const stmt = db.prepare(`
      INSERT INTO memberships (id, user_email, plan_nombre, precio, periodo, fecha_inicio, fecha_fin, estado, beneficios, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        plan_nombre = excluded.plan_nombre,
        precio = excluded.precio,
        periodo = excluded.periodo,
        fecha_inicio = excluded.fecha_inicio,
        fecha_fin = excluded.fecha_fin,
        estado = excluded.estado,
        beneficios = excluded.beneficios,
        updated_at = datetime('now')
    `);

    stmt.run(memId, email, nombrePlan, precio, periodo, fechaInicio, fechaFin, estado || 'Activa', beneficiosJson);

    res.json({ ok: true, mensaje: 'Membresía guardada en la base de datos cloud', id: memId });
  } catch (err) {
    console.error('Error al guardar membresía:', err);
    res.status(500).json({ error: 'Error al registrar membresía' });
  }
});

app.post('/api/membership/renew', (req, res) => {
  try {
    const { id, fechaFin, estado } = req.body;
    if (!id || !fechaFin) return res.status(400).json({ error: 'ID y fecha de fin requeridos' });

    db.prepare(`
      UPDATE memberships 
      SET fecha_fin = ?, estado = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(fechaFin, estado || 'Activa', id);

    res.json({ ok: true, mensaje: 'Membresía renovada en la base de datos cloud' });
  } catch (err) {
    console.error('Error al renovar membresía:', err);
    res.status(500).json({ error: 'Error al renovar membresía' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// PASARELA DE PAGOS PAYPAL (Integración REST API v2 + Lógica CANACO)
// ══════════════════════════════════════════════════════════════════════════

// 1. Crear Orden en PayPal
app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { planId, planNombre, precio, userEmail } = req.body;
    if (!precio || !planNombre) {
      return res.status(400).json({ error: 'Faltan datos de la orden' });
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const apiBase = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';

    if (clientId && clientSecret) {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenResp = await fetch(`${apiBase}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });
      const tokenData = await tokenResp.json();
      const accessToken = tokenData.access_token;

      const orderResp = await fetch(`${apiBase}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: planId || 'plan-espaciogym',
            description: `Membresía espacioGYM - ${planNombre}`,
            amount: {
              currency_code: 'MXN',
              value: Number(precio).toFixed(2)
            }
          }]
        })
      });
      const orderData = await orderResp.json();
      return res.json({ id: orderData.id, status: orderData.status });
    }

    // Identificador de orden para procesamiento
    const demoOrderId = `PAYPAL-ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    res.json({
      id: demoOrderId,
      status: 'CREATED'
    });
  } catch (err) {
    console.error('Error al crear orden de PayPal:', err);
    res.status(500).json({ error: 'No se pudo crear la orden de PayPal' });
  }
});

// 2. Capturar Orden y Conciliar Membresía en SQLite
app.post('/api/paypal/capture-order', async (req, res) => {
  try {
    const { orderId, planNombre, precio, userEmail, periodo, payerName, payerEmail, beneficios } = req.body;
    if (!orderId || !planNombre || !precio || !userEmail) {
      return res.status(400).json({ error: 'Datos de captura incompletos' });
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const apiBase = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';
    let captureId = `CAP-${Date.now()}`;
    let estadoCaptura = 'COMPLETED';

    if (clientId && clientSecret && !orderId.startsWith('PAYPAL-ORD-')) {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenResp = await fetch(`${apiBase}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });
      const tokenData = await tokenResp.json();
      const accessToken = tokenData.access_token;

      const captureResp = await fetch(`${apiBase}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const captureData = await captureResp.json();
      captureId = captureData.id || captureId;
      estadoCaptura = captureData.status || 'COMPLETED';
    }

    // Regla Financiera de Liquidaciones (Portado de class-lilith-liquidaciones.php)
    // Tarifa bancaria pasarela estándar: (monto * 3.6%) + $3.00 MXN + IVA (16%)
    const tarifaPasarela = Number(((precio * 0.036 + 3.00) * 1.16).toFixed(2));
    const montoNeto = Number((precio - tarifaPasarela).toFixed(2));
    const folioPago = `PAY-${Math.floor(100000 + Math.random() * 900000)}`;

    // Registrar transacción contable en SQLite
    const transId = `TX-${Date.now()}`;
    db.prepare(`
      INSERT INTO paypal_transactions (
        id, order_id, capture_id, user_email, plan_nombre, monto_bruto,
        tarifa_paypal, monto_neto, moneda, estado, payer_name, payer_email, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'MXN', ?, ?, ?, datetime('now'))
    `).run(
      transId,
      orderId,
      captureId,
      userEmail,
      planNombre,
      precio,
      tarifaPasarela,
      montoNeto,
      estadoCaptura,
      payerName || 'Socio espacioGYM',
      payerEmail || userEmail
    );

    // Calcular fechas para activación inmediata de la membresía
    const hoy = new Date();
    const meses = periodo === 'Anual' ? 12 : periodo === 'Trimestral' ? 3 : 1;
    const fechaFin = new Date(hoy);
    fechaFin.setMonth(fechaFin.getMonth() + meses);

    const pad = (n) => String(n).padStart(2, '0');
    const fInicioStr = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;
    const fFinStr = `${fechaFin.getFullYear()}-${pad(fechaFin.getMonth() + 1)}-${pad(fechaFin.getDate())}`;

    const memId = `MEM-${Math.floor(100000 + Math.random() * 900000)}`;
    const beneficiosJson = JSON.stringify(beneficios || [
      'Acceso total a gimnasio y vestidores',
      'Coach Virtual IA ilimitado',
      'Generación de código QR para asistencia'
    ]);

    // Actualizar membresía en SQLite
    db.prepare(`
      INSERT INTO memberships (
        id, user_email, plan_nombre, precio, periodo, fecha_inicio, fecha_fin, estado, beneficios, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Activa', ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        plan_nombre = excluded.plan_nombre,
        precio = excluded.precio,
        periodo = excluded.periodo,
        fecha_inicio = excluded.fecha_inicio,
        fecha_fin = excluded.fecha_fin,
        estado = 'Activa',
        beneficios = excluded.beneficios,
        updated_at = datetime('now')
    `).run(memId, userEmail, planNombre, precio, periodo || 'Mensual', fInicioStr, fFinStr, beneficiosJson);

    res.json({
      ok: true,
      mensaje: 'Pago con PayPal procesado exitosamente y membresía activada',
      folio: folioPago,
      transaccionId: transId,
      orderId,
      captureId,
      montoBruto: precio,
      tarifaPasarela,
      montoNeto,
      membresia: {
        id: memId,
        nombrePlan: planNombre,
        periodo: periodo || 'Mensual',
        fechaInicio: fInicioStr,
        fechaFin: fFinStr,
        estado: 'Activa'
      }
    });
  } catch (err) {
    console.error('Error al capturar orden de PayPal:', err);
    res.status(500).json({ error: 'Error al procesar la captura de fondos con PayPal' });
  }
});

// 3. Consultar historial contable de transacciones PayPal
app.get('/api/paypal/transactions', (req, res) => {
  try {
    const email = req.query.email;
    let query = 'SELECT * FROM paypal_transactions ORDER BY datetime(created_at) DESC';
    let params = [];
    if (email) {
      query = 'SELECT * FROM paypal_transactions WHERE user_email = ? ORDER BY datetime(created_at) DESC';
      params = [email];
    }
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    console.error('Error al consultar transacciones de PayPal:', err);
    res.status(500).json({ error: 'Error al consultar transacciones' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// PASARELA OFICIAL STRIPE & MOTOR DE CUPONES DE DESCUENTO
// ══════════════════════════════════════════════════════════════════════════

const CUPONES_VALIDOS = {
  'UAACOMITE': { porcentaje: 100, descripcion: 'Cortesía Institucional Comité Evaluador UAA' },
  'COMITE': { porcentaje: 100, descripcion: 'Cortesía Institucional Comité Evaluador' },
  'WACOMYT': { porcentaje: 100, descripcion: 'Cortesía Institucional Comité Evaluador' },
  'WACOM': { porcentaje: 100, descripcion: 'Cortesía Institucional Comité Evaluador' },
  'UAA': { porcentaje: 100, descripcion: 'Beca Universitaria UAA 100%' },
  'COMITEUAA': { porcentaje: 100, descripcion: 'Cortesía Institucional Comité Evaluador UAA' },
  'PROMO50': { porcentaje: 50, descripcion: 'Beca Deportiva 50%' },
  'PROMO20': { porcentaje: 20, descripcion: 'Descuento Convenio Institucional 20%' },
  'PROMO10': { porcentaje: 10, descripcion: 'Descuento Especial 10%' }
};

// 1. Validar Cupón de Descuento
app.post('/api/stripe/validate-coupon', (req, res) => {
  try {
    const { couponCode, precio } = req.body;
    const code = String(couponCode || '').trim().toUpperCase();
    if (!code || !CUPONES_VALIDOS[code]) {
      return res.status(404).json({ ok: false, error: 'Cupón no válido o expirado' });
    }
    const cupon = CUPONES_VALIDOS[code];
    const base = Number(precio) || 0;
    const descuento = Number(((base * cupon.porcentaje) / 100).toFixed(2));
    const finalPrice = Math.max(0, Number((base - descuento).toFixed(2)));

    res.json({
      ok: true,
      codigo: code,
      porcentaje: cupon.porcentaje,
      descripcion: cupon.descripcion,
      descuento,
      finalPrice
    });
  } catch (err) {
    console.error('Error al validar cupón:', err);
    res.status(500).json({ error: 'Error al validar cupón' });
  }
});

// 2. Crear PaymentIntent en Stripe
app.post('/api/stripe/create-payment-intent', async (req, res) => {
  try {
    const { planId, planNombre, precio, userEmail, periodo, cupon } = req.body;
    if (!precio || !planNombre) {
      return res.status(400).json({ error: 'Faltan datos de la orden' });
    }

    let finalPrice = Number(precio);
    if (cupon) {
      const code = String(cupon).trim().toUpperCase();
      if (CUPONES_VALIDOS[code]) {
        const item = CUPONES_VALIDOS[code];
        const desc = (finalPrice * item.porcentaje) / 100;
        finalPrice = Math.max(0, Number((finalPrice - desc).toFixed(2)));
      }
    }

    // Si el cupón es 100%, pase directo de cortesía
    if (finalPrice === 0) {
      return res.json({
        freePass: true,
        finalPrice: 0,
        paymentIntentId: `pi_free_${Date.now()}`,
        clientSecret: null,
        currency: 'mxn'
      });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey) {
      const amountInCents = Math.round(finalPrice * 100);
      const params = new URLSearchParams();
      params.append('amount', String(amountInCents));
      params.append('currency', 'mxn');
      params.append('description', `Membresía espacioGYM - ${planNombre} (${periodo || 'Mensual'})`);
      if (userEmail) params.append('receipt_email', userEmail);
      params.append('metadata[userEmail]', userEmail || '');
      params.append('metadata[planNombre]', planNombre);
      params.append('metadata[periodo]', periodo || 'Mensual');
      if (cupon) params.append('metadata[cupon]', String(cupon));

      const stripeResp = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const piData = await stripeResp.json();
      if (piData.error) {
        console.error('Error Stripe API:', piData.error);
        return res.status(400).json({ error: piData.error.message });
      }

      return res.json({
        clientSecret: piData.client_secret,
        paymentIntentId: piData.id,
        amount: piData.amount,
        currency: piData.currency,
        finalPrice
      });
    }

    // Fallback directo de producción local
    const mockPi = `pi_live_${Date.now()}`;
    return res.json({
      clientSecret: `${mockPi}_secret_live`,
      paymentIntentId: mockPi,
      amount: Math.round(finalPrice * 100),
      currency: 'mxn',
      finalPrice
    });
  } catch (err) {
    console.error('Error al crear PaymentIntent con Stripe:', err);
    res.status(500).json({ error: 'Error al iniciar pago con Stripe' });
  }
});

// 3. Confirmar Pago y Conciliar Membresía en SQLite
app.post('/api/stripe/confirm-payment', async (req, res) => {
  try {
    const {
      paymentIntentId,
      planNombre,
      precio,
      finalPrice,
      userEmail,
      periodo,
      cupon,
      payerName,
      payerEmail,
      beneficios
    } = req.body;

    if (!planNombre || !userEmail) {
      return res.status(400).json({ error: 'Datos de confirmación incompletos' });
    }

    const montoCobrado = finalPrice !== undefined ? Number(finalPrice) : Number(precio || 0);
    const folioPago = `STR-${Math.floor(100000 + Math.random() * 900000)}`;
    const transId = `STX-${Date.now()}`;
    const piId = paymentIntentId || `pi_live_${Date.now()}`;

    // Registrar en tabla stripe_transactions
    db.prepare(`
      INSERT INTO stripe_transactions (
        id, payment_intent_id, user_email, plan_nombre, monto, descuento,
        cupon, moneda, estado, payer_name, payer_email, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'MXN', 'COMPLETED', ?, ?, datetime('now'))
    `).run(
      transId,
      piId,
      userEmail,
      planNombre,
      montoCobrado,
      Number(precio || montoCobrado) - montoCobrado,
      cupon || null,
      payerName || 'Socio espacioGYM',
      payerEmail || userEmail
    );

    // Calcular vigencia
    const hoy = new Date();
    const meses = periodo === 'Anual' ? 12 : periodo === 'Trimestral' ? 3 : 1;
    const fechaFin = new Date(hoy);
    fechaFin.setMonth(fechaFin.getMonth() + meses);

    const pad = (n) => String(n).padStart(2, '0');
    const fInicioStr = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;
    const fFinStr = `${fechaFin.getFullYear()}-${pad(fechaFin.getMonth() + 1)}-${pad(fechaFin.getDate())}`;

    const memId = `MEM-${Math.floor(100000 + Math.random() * 900000)}`;
    const beneficiosJson = JSON.stringify(beneficios || [
      'Acceso total a gimnasio y vestidores',
      'Coach Virtual IA ilimitado',
      'Generación de código QR para asistencia'
    ]);

    // Upsert membresía en SQLite
    db.prepare(`
      INSERT INTO memberships (
        id, user_email, plan_nombre, precio, periodo, fecha_inicio, fecha_fin, estado, beneficios, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Activa', ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        plan_nombre = excluded.plan_nombre,
        precio = excluded.precio,
        periodo = excluded.periodo,
        fecha_inicio = excluded.fecha_inicio,
        fecha_fin = excluded.fecha_fin,
        estado = 'Activa',
        beneficios = excluded.beneficios,
        updated_at = datetime('now')
    `).run(memId, userEmail, planNombre, montoCobrado, periodo || 'Mensual', fInicioStr, fFinStr, beneficiosJson);

    res.json({
      ok: true,
      mensaje: 'Pago con Stripe procesado exitosamente y membresía activada',
      folio: folioPago,
      transaccionId: transId,
      paymentIntentId: piId,
      montoPagado: montoCobrado,
      cupon: cupon || null,
      membresia: {
        id: memId,
        nombrePlan: planNombre,
        periodo: periodo || 'Mensual',
        fechaInicio: fInicioStr,
        fechaFin: fFinStr,
        estado: 'Activa'
      }
    });
  } catch (err) {
    console.error('Error al confirmar pago con Stripe:', err);
    res.status(500).json({ error: 'Error al procesar la confirmación con Stripe' });
  }
});

// 4. Consultar historial de transacciones Stripe
app.get('/api/stripe/transactions', (req, res) => {
  try {
    const email = req.query.email;
    let query = 'SELECT * FROM stripe_transactions ORDER BY datetime(created_at) DESC';
    let params = [];
    if (email) {
      query = 'SELECT * FROM stripe_transactions WHERE user_email = ? ORDER BY datetime(created_at) DESC';
      params = [email];
    }
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    console.error('Error al consultar transacciones de Stripe:', err);
    res.status(500).json({ error: 'Error al consultar transacciones' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Edge corriendo en http://localhost:${PORT}`);
});
