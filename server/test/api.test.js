import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const tmpDb = path.join(os.tmpdir(), `espaciogym_test_${process.pid}_${Date.now()}.db`);
process.env.SQLITE_DB_PATH = tmpDb;
process.env.DISABLE_LISTEN = '1';
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.SEED_ADMIN_EMAIL = 'admin@gymseminario.com';
process.env.SEED_ADMIN_PASSWORD = 'AdminSeedTestPassword!';

const { default: createApp } = await import('../index.js');
const { default: db } = await import('../services/db.js');

delete process.env.BREVO_API_KEY;
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_USER;
delete process.env.EMAIL_PASS;

const stripeIntents = new Map();
let stripeEnabled = true;

const mockStripe = {
  paymentIntents: {
    async create(params) {
      const id = `pi_mock_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
      const record = {
        id,
        client_secret: `${id}_secret_test`,
        amount: params.amount,
        currency: params.currency,
        status: 'requires_payment_method',
      };
      stripeIntents.set(id, record);
      return record;
    },
    async retrieve(id) {
      const rec = stripeIntents.get(id);
      if (!rec) {
        throw new Error(`No such payment_intent: ${id}`);
      }
      return rec;
    },
  },
};

const app = createApp({
  enableRateLimit: false,
  getStripe: () => (stripeEnabled ? mockStripe : null),
  verifyGoogleToken: async (credential) => {
    if (credential === 'valid-google-token') {
      return { email: 'google.socio@espaciogym.mx', name: 'Google Socio' };
    }
    throw new Error('Invalid Google token');
  },
});

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  db.close();
  for (const suffix of ['', '-shm', '-wal']) {
    if (fs.existsSync(tmpDb + suffix)) fs.unlinkSync(tmpDb + suffix);
  }
});

async function api(route, { method = 'GET', body, token, headers = {} } = {}) {
  const reqHeaders = { ...headers };
  if (body !== undefined) reqHeaders['content-type'] = 'application/json';
  if (token) reqHeaders.authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

test('Auth, cryptographic JWT enforcement, password change, OTP production safety & RBAC', async () => {
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: { email: 'socio1@test.mx', password: 'Password123!', nombre: 'Socio Uno' },
  });
  assert.equal(reg.status, 201);
  assert.ok(reg.data.token);
  assert.equal(reg.data.user.role, 'user');
  const userToken = reg.data.token;

  const dup = await api('/api/auth/register', {
    method: 'POST',
    body: { email: 'socio1@test.mx', password: 'Password123!', nombre: 'Socio Uno' },
  });
  assert.equal(dup.status, 409);

  // Unverified forged base64 JWT must be rejected with 401
  const fakeHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const fakePayload = Buffer.from(
    JSON.stringify({ uid: 999, email: 'admin@gymseminario.com', role: 'admin' }),
  ).toString('base64url');
  const forgedJwt = `${fakeHeader}.${fakePayload}.forgedsignature`;

  assert.equal((await api('/api/auth/me', { token: forgedJwt })).status, 401);
  assert.equal((await api('/api/auth/users', { token: forgedJwt })).status, 401);
  assert.equal((await api('/api/stripe/transactions', { token: forgedJwt })).status, 401);
  assert.equal(
    (
      await api('/api/rutina', {
        method: 'POST',
        headers: { 'x-user-email': 'admin@gymseminario.com' },
        body: { nombre: 'Spoof' },
      })
    ).status,
    401,
  );

  // Change password requires correct current password
  const badChange = await api('/api/auth/change-password', {
    method: 'POST',
    token: userToken,
    body: { currentPassword: 'WrongPassword!', newPassword: 'NewPassword456!' },
  });
  assert.equal(badChange.status, 401);

  const okChange = await api('/api/auth/change-password', {
    method: 'POST',
    token: userToken,
    body: { currentPassword: 'Password123!', newPassword: 'NewPassword456!' },
  });
  assert.equal(okChange.status, 200);

  const loginNew = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'socio1@test.mx', password: 'NewPassword456!' },
  });
  assert.equal(loginNew.status, 200);

  // Google auth
  const googleRes = await api('/api/auth/google', {
    method: 'POST',
    body: { credential: 'valid-google-token' },
  });
  assert.equal(googleRes.status, 200);
  assert.equal(googleRes.data.user.email, 'google.socio@espaciogym.mx');

  // Phone OTP hides code in production
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const otpProd = await api('/api/auth/phone', {
    method: 'POST',
    body: { phone: '4491234567' },
  });
  process.env.NODE_ENV = prevEnv;
  assert.equal(otpProd.status, 200);
  assert.equal(otpProd.data.devCode, undefined);

  // Admin login and RBAC role assignment
  const adminLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@gymseminario.com', password: 'AdminSeedTestPassword!' },
  });
  assert.equal(adminLogin.status, 200);
  const adminToken = adminLogin.data.token;

  assert.equal((await api('/api/auth/users', { token: userToken })).status, 403);
  const usersRes = await api('/api/auth/users', { token: adminToken });
  assert.equal(usersRes.status, 200);
  assert.ok(Array.isArray(usersRes.data));

  const setRoleRes = await api('/api/auth/set-role', {
    method: 'POST',
    token: adminToken,
    body: { email: 'google.socio@espaciogym.mx', role: 'reception' },
  });
  assert.equal(setRoleRes.status, 200);
});

test('Strict Stripe coupons, PaymentIntent verification, atomic membership & product purchases', async () => {
  const socioLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'socio1@test.mx', password: 'NewPassword456!' },
  });
  const socioToken = socioLogin.data.token;

  // Validate coupon
  const couponOk = await api('/api/stripe/validate-coupon', {
    method: 'POST',
    body: { couponCode: 'UAACOMITE', precio: 550 },
  });
  assert.equal(couponOk.status, 200);
  assert.equal(couponOk.data.precioFinal, 0);

  // 503 when Stripe unconfigured for paid intent
  stripeEnabled = false;
  const noStripe = await api('/api/stripe/create-payment-intent', {
    method: 'POST',
    token: socioToken,
    body: { planNombre: 'Plan Pro', precio: 550 },
  });
  assert.equal(noStripe.status, 503);
  stripeEnabled = true;

  // $0 freePass coupon intent & strict confirm-payment checks
  const freeIntent = await api('/api/stripe/create-payment-intent', {
    method: 'POST',
    token: socioToken,
    body: { planNombre: 'Plan Pro', precio: 550, cupon: 'UAACOMITE' },
  });
  assert.equal(freeIntent.status, 200);
  assert.equal(freeIntent.data.freeCoupon, true);

  // Reject $0 confirm without valid 100% coupon
  const badZero = await api('/api/stripe/confirm-payment', {
    method: 'POST',
    token: socioToken,
    body: { planNombre: 'Plan Pro', precio: 0, finalPrice: 0 },
  });
  assert.equal(badZero.status, 400);

  // Reject fake pi_live_* bypass
  const badBypass = await api('/api/stripe/confirm-payment', {
    method: 'POST',
    token: socioToken,
    body: { planNombre: 'Plan Pro', precio: 550, paymentIntentId: 'pi_live_fake999' },
  });
  assert.equal(badBypass.status, 400);

  // Confirm $0 membership with UAACOMITE -> activates membership & promotes user -> subscriber
  const confirmMem = await api('/api/stripe/confirm-payment', {
    method: 'POST',
    token: socioToken,
    body: {
      planNombre: 'Plan Pro',
      precio: 550,
      cupon: 'UAACOMITE',
      periodo: 'Mensual',
      autoRenew: true,
      paymentIntentId: freeIntent.data.paymentIntentId,
    },
  });
  assert.equal(confirmMem.status, 200);
  assert.match(confirmMem.data.folio, /^STR-\d{6}$/);
  assert.equal(confirmMem.data.membresia.estado, 'Activa');

  const meAfter = await api('/api/auth/me', { token: socioToken });
  assert.equal(meAfter.data.role, 'subscriber');

  // Create paid product PaymentIntent
  const prodIntent = await api('/api/stripe/create-payment-intent', {
    method: 'POST',
    token: socioToken,
    body: {
      type: 'product',
      items: [{ id: 1, cantidad: 1 }],
      cupon: 'PROMO50',
    },
  });
  assert.equal(prodIntent.status, 200);
  assert.equal(prodIntent.data.precioFinal, 675);

  // Reject confirm while PaymentIntent is not succeeded
  const confirmPending = await api('/api/stripe/confirm-payment', {
    method: 'POST',
    token: socioToken,
    body: {
      type: 'product',
      items: [{ id: 1, cantidad: 1 }],
      cupon: 'PROMO50',
      paymentIntentId: prodIntent.data.paymentIntentId,
    },
  });
  assert.equal(confirmPending.status, 400);

  // Mark succeeded in mock Stripe & confirm
  stripeIntents.get(prodIntent.data.paymentIntentId).status = 'succeeded';
  const confirmProd = await api('/api/stripe/confirm-payment', {
    method: 'POST',
    token: socioToken,
    body: {
      type: 'product',
      planNombre: '1x Gymshark Whey Protein',
      items: [{ id: 1, cantidad: 1 }],
      cupon: 'PROMO50',
      paymentIntentId: prodIntent.data.paymentIntentId,
    },
  });
  assert.equal(confirmProd.status, 200);
  assert.equal(confirmProd.data.type, 'product');

  // Verify membership was NOT overwritten by product purchase
  const memAfterProd = await api('/api/membership', { token: socioToken });
  assert.equal(memAfterProd.status, 200);
  assert.equal(memAfterProd.data.nombrePlan, 'Plan Pro');
  assert.equal(memAfterProd.data.autoRenew, true);

  // Transactions visible to owner
  const txRes = await api('/api/stripe/transactions', { token: socioToken });
  assert.equal(txRes.status, 200);
  assert.equal(txRes.data.length, 2);
});

test('QR issue, single-use validation, replay/expiry rejection, profiles, logs, routines, stats & products', async () => {
  const socioLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'socio1@test.mx', password: 'NewPassword456!' },
  });
  const socioToken = socioLogin.data.token;

  const adminLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@gymseminario.com', password: 'AdminSeedTestPassword!' },
  });
  const adminToken = adminLogin.data.token;

  // Register a user without membership -> QR issue denied
  const noMemUser = await api('/api/auth/register', {
    method: 'POST',
    body: { email: 'sinplan@test.mx', password: 'Password123!', nombre: 'Sin Plan' },
  });
  assert.equal(
    (await api('/api/qr/issue', { method: 'POST', token: noMemUser.data.token, body: {} })).status,
    403,
  );

  // Issue QR for active subscriber
  const qrIssue = await api('/api/qr/issue', {
    method: 'POST',
    token: socioToken,
    body: { clase: 'Boxeo' },
  });
  assert.equal(qrIssue.status, 201);
  assert.match(qrIssue.data.token, /^GROM-/);

  // Non-staff cannot validate QR
  assert.equal(
    (
      await api('/api/qr/validate', {
        method: 'POST',
        token: socioToken,
        body: { token: qrIssue.data.token },
      })
    ).status,
    403,
  );

  // Admin validates QR -> 200 + attendance logged
  const qrVal = await api('/api/qr/validate', {
    method: 'POST',
    token: adminToken,
    body: { token: qrIssue.data.token },
  });
  assert.equal(qrVal.status, 200);
  assert.equal(qrVal.data.codigo, 'ACCESO_CONCEDIDO');

  // Replay rejected -> 409
  const qrReplay = await api('/api/qr/validate', {
    method: 'POST',
    token: adminToken,
    body: { token: qrIssue.data.token },
  });
  assert.equal(qrReplay.status, 409);
  assert.equal(qrReplay.data.codigo, 'QR_YA_USADO');

  // Edge asistencia validation requires codigoQr
  assert.equal(
    (await api('/api/edge/asistencia', { method: 'POST', body: { uid: '1' } })).status,
    400,
  );

  // Profiles & measurements
  const profUp = await api('/api/profile', {
    method: 'PUT',
    token: socioToken,
    body: {
      nombre: 'Socio Uno',
      edad: 24,
      objetivo: 'Hipertrofia',
      restriccionesMedicas: 'Lesión leve de rodilla',
    },
  });
  assert.equal(profUp.status, 200);

  const measRes = await api('/api/profile/measurements', {
    method: 'POST',
    token: socioToken,
    body: { peso: 96, altura: 170, cintura: 98, grasaCorporal: 28, restriccionesMedicas: 'Lesión leve de rodilla' },
  });
  assert.equal(measRes.status, 201);
  assert.ok(measRes.data.imc > 30);
  assert.ok(measRes.data.healthAlerts.some((a) => a.codigo === 'IMC_ELEVADO'));
  assert.ok(measRes.data.healthAlerts.some((a) => a.codigo === 'RESTRICCION_MEDICA'));

  // Workout logs
  const logCreate = await api('/api/workout-logs', {
    method: 'POST',
    token: socioToken,
    body: { ejercicio: 'Sentadilla Libre', grupoMuscular: 'Pierna', series: 4, repeticiones: '10', pesoKg: 100, rpe: 8.5 },
  });
  assert.equal(logCreate.status, 201);
  assert.equal(
    (await api(`/api/workout-logs/${logCreate.data.log.id}`, { method: 'DELETE', token: noMemUser.data.token })).status,
    403,
  );
  assert.equal(
    (await api(`/api/workout-logs/${logCreate.data.log.id}`, { method: 'DELETE', token: socioToken })).status,
    200,
  );

  // Routines persistence & trainer/admin assignment
  const assignRoutine = await api('/api/routines', {
    method: 'POST',
    token: adminToken,
    body: {
      userEmail: 'socio1@test.mx',
      titulo: 'Fuerza 4 Días',
      rutina: { tituloRutina: 'Fuerza 4 Días', diasSemana: [] },
    },
  });
  assert.equal(assignRoutine.status, 201);
  const getRoutines = await api('/api/routines', { token: socioToken });
  assert.equal(getRoutines.status, 200);
  assert.equal(getRoutines.data[0].titulo, 'Fuerza 4 Días');

  // Bookings CRUD, availability, stats & forecast
  const bk = await api('/api/bookings', {
    method: 'POST',
    token: socioToken,
    body: { entrenamiento: 'Boxeo', fecha: '2026-12-01', turno: 'Matutino' },
  });
  assert.equal(bk.status, 201);
  assert.equal(
    (
      await api(`/api/bookings/${bk.data.id}`, {
        method: 'PUT',
        token: socioToken,
        body: { turno: 'Vespertino' },
      })
    ).status,
    200,
  );
  const avail = await api('/api/sessions/availability?fecha=2026-12-01');
  assert.equal(avail.status, 200);
  assert.ok(avail.data.slots.some((s) => s.disciplina === 'Boxeo' && s.turno === 'Vespertino' && s.reservados === 1));

  const stats = await api('/api/sessions/stats');
  assert.equal(stats.status, 200);
  assert.ok(stats.data.totalBookings >= 5);
  assert.ok(stats.data.activeMemberships >= 1);

  const forecast = await api('/api/analytics/forecast', { token: adminToken });
  assert.equal(forecast.status, 200);
  assert.ok(forecast.data.staffingRecommendation);

  // Products catalog (40 items, #1 == 1350) & admin CRUD
  const prods = await api('/api/products');
  assert.equal(prods.status, 200);
  assert.equal(prods.data.length, 40);
  assert.equal(prods.data[0].nombre, 'Gymshark Whey Protein');
  assert.equal(prods.data[0].precio, 1350);

  assert.equal(
    (await api('/api/products', { method: 'POST', token: socioToken, body: { nombre: 'X', precio: 100 } })).status,
    403,
  );
  const createdProd = await api('/api/products', {
    method: 'POST',
    token: adminToken,
    body: { nombre: 'Shaker Pro', precio: 250, categoria: 'accesorio', stock: 15 },
  });
  assert.equal(createdProd.status, 201);
  assert.equal(
    (await api(`/api/products/${createdProd.data.id}`, { method: 'PUT', token: adminToken, body: { precio: 275 } })).data.precio,
    275,
  );
  assert.equal(
    (await api(`/api/products/${createdProd.data.id}`, { method: 'DELETE', token: adminToken })).status,
    200,
  );

  // Admin membership assign & expiring check
  const assignMem = await api('/api/admin/memberships/assign', {
    method: 'POST',
    token: adminToken,
    body: {
      userEmail: 'sinplan@test.mx',
      planNombre: 'Plan Básico',
      precio: 350,
      fechaFin: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    },
  });
  assert.equal(assignMem.status, 200);
  const expiring = await api('/api/admin/expiring-memberships?days=5', { token: adminToken });
  assert.equal(expiring.status, 200);
  assert.ok(expiring.data.some((m) => m.userEmail === 'sinplan@test.mx'));
  const notifyRes = await api('/api/admin/notify-expiring', {
    method: 'POST',
    token: adminToken,
    body: { email: 'sinplan@test.mx', days: 5 },
  });
  assert.equal(notifyRes.status, 200);
  assert.equal(notifyRes.data.notifiedCount, 1);
});

test('Strict Admin-only RBAC, pure reception isolation, and rotating Kiosk QR check-in', async () => {
  const adminLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@gymseminario.com', password: 'AdminSeedTestPassword!' },
  });
  const adminToken = adminLogin.data.token;

  // Admin cannot demote protected ADMIN_EMAILS
  const demoteRes = await api('/api/auth/set-role', {
    method: 'POST',
    token: adminToken,
    body: { email: 'admin@gymseminario.com', role: 'user' },
  });
  assert.equal(demoteRes.status, 403);

  // Create pure reception user and unsubscribed free user
  const recepReg = await api('/api/auth/register', {
    method: 'POST',
    body: { email: 'recepcion@test.mx', password: 'Password123!', nombre: 'Recepcionista' },
  });
  await api('/api/auth/set-role', {
    method: 'POST',
    token: adminToken,
    body: { email: 'recepcion@test.mx', role: 'reception' },
  });
  const recepToken = recepReg.data.token;

  const freeReg = await api('/api/auth/register', {
    method: 'POST',
    body: { email: 'libre@test.mx', password: 'Password123!', nombre: 'Usuario Libre' },
  });
  const freeToken = freeReg.data.token;

  // Pure reception blocked from admin endpoints, Coach IA, workout logs, and routines
  assert.equal(
    (
      await api('/api/admin/memberships/assign', {
        method: 'POST',
        token: recepToken,
        body: { userEmail: 'libre@test.mx', planNombre: 'Plan Pro' },
      })
    ).status,
    403,
  );
  assert.equal((await api('/api/admin/expiring-memberships', { token: recepToken })).status, 403);
  assert.equal(
    (await api('/api/admin/notify-expiring', { method: 'POST', token: recepToken, body: {} })).status,
    403,
  );
  assert.equal((await api('/api/auth/users', { token: recepToken })).status, 403);
  assert.equal(
    (
      await api('/api/auth/set-role', {
        method: 'POST',
        token: recepToken,
        body: { email: 'libre@test.mx', role: 'subscriber' },
      })
    ).status,
    403,
  );
  assert.equal((await api('/api/analytics/forecast', { token: recepToken })).status, 403);
  assert.equal(
    (await api('/api/coach/chat', { method: 'POST', token: recepToken, body: { mensaje: 'Hola' } })).status,
    403,
  );
  assert.equal(
    (await api('/api/rutina', { method: 'POST', token: recepToken, body: { nombre: 'Recep' } })).status,
    403,
  );
  assert.equal((await api('/api/workout-logs', { token: recepToken })).status, 403);
  assert.equal(
    (
      await api('/api/workout-logs', {
        method: 'POST',
        token: recepToken,
        body: { ejercicio: 'Press' },
      })
    ).status,
    403,
  );
  assert.equal((await api('/api/routines', { token: recepToken })).status, 403);
  assert.equal(
    (
      await api('/api/routines', {
        method: 'POST',
        token: recepToken,
        body: { titulo: 'Test', rutina: {} },
      })
    ).status,
    403,
  );

  // Admin assigns Cortesía VIP to free user -> promotes user -> subscriber
  const assignVip = await api('/api/admin/memberships/assign', {
    method: 'POST',
    token: adminToken,
    body: { userEmail: 'libre@test.mx', planNombre: 'Cortesía VIP', periodo: 'Mensual' },
  });
  assert.equal(assignVip.status, 200);
  const libreMe = await api('/api/auth/me', { token: freeToken });
  assert.equal(libreMe.data.role, 'subscriber');

  // Personal QR with ttlSeconds
  const personalShort = await api('/api/qr/issue', {
    method: 'POST',
    token: freeToken,
    body: { ttlSeconds: 30, clase: 'Crossfit' },
  });
  assert.equal(personalShort.status, 201);
  assert.equal(personalShort.data.tokenType, 'member');
  assert.equal(personalShort.data.ttlSeconds, 30);

  // Rotating Kiosk QR: subscriber cannot issue, reception can issue
  assert.equal(
    (await api('/api/qr/kiosk/issue', { method: 'POST', token: freeToken, body: { ttlSeconds: 30 } })).status,
    403,
  );
  const kioskIssue = await api('/api/qr/kiosk/issue', {
    method: 'POST',
    token: recepToken,
    body: { ttlSeconds: 30 },
  });
  assert.equal(kioskIssue.status, 201);
  assert.equal(kioskIssue.data.tokenType, 'kiosk');
  assert.match(kioskIssue.data.token, /^GROM-K-/);

  // /api/qr/validate rejects kiosk tokens cleanly
  const wrongVal = await api('/api/qr/validate', {
    method: 'POST',
    token: recepToken,
    body: { token: kioskIssue.data.token },
  });
  assert.equal(wrongVal.status, 400);
  assert.equal(wrongVal.data.codigo, 'QR_MOSTRADOR');

  // Reception cannot checkin on kiosk QR; subscriber checks in once, duplicate rejected 409
  assert.equal(
    (
      await api('/api/qr/kiosk/checkin', {
        method: 'POST',
        token: recepToken,
        body: { token: kioskIssue.data.token },
      })
    ).status,
    403,
  );

  // User without subscription cannot kiosk checkin
  const unsubReg = await api('/api/auth/register', {
    method: 'POST',
    body: { email: 'nosub@test.mx', password: 'Password123!', nombre: 'Sin Suscripcion' },
  });
  const unsubCheckin = await api('/api/qr/kiosk/checkin', {
    method: 'POST',
    token: unsubReg.data.token,
    body: { token: kioskIssue.data.token },
  });
  assert.equal(unsubCheckin.status, 403);
  assert.equal(unsubCheckin.data.codigo, 'MEMBRESIA_VENCIDA');

  const okCheckin = await api('/api/qr/kiosk/checkin', {
    method: 'POST',
    token: freeToken,
    body: { token: kioskIssue.data.token, clase: 'Pesas' },
  });
  assert.equal(okCheckin.status, 201);
  assert.equal(okCheckin.data.codigo, 'ACCESO_CONCEDIDO');

  const dupCheckin = await api('/api/qr/kiosk/checkin', {
    method: 'POST',
    token: freeToken,
    body: { token: kioskIssue.data.token },
  });
  assert.equal(dupCheckin.status, 409);
  assert.equal(dupCheckin.data.codigo, 'ASISTENCIA_YA_REGISTRADA');

  // Expired kiosk QR rejected 403
  db.prepare(
    "INSERT INTO qr_tokens (token, token_type, user_email, clase, fecha, expires_at) VALUES (?, 'kiosk', ?, 'Acceso Mostrador', '2026-11-22', ?)",
  ).run('GROM-K-EXPIRED1', 'recepcion@test.mx', new Date(Date.now() - 60000).toISOString());
  const expCheckin = await api('/api/qr/kiosk/checkin', {
    method: 'POST',
    token: freeToken,
    body: { token: 'GROM-K-EXPIRED1' },
  });
  assert.equal(expCheckin.status, 403);
  assert.equal(expCheckin.data.codigo, 'QR_EXPIRADO');
});
