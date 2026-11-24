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
const { clearCoachVoiceCache, limpiarTextoParaVoz } = await import(
  '../services/coachVoice.service.js'
);
const { COACHES, buildUserJsonContext } = await import(
  '../services/coachChat.service.js'
);

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

const voiceFetchCalls = [];
let mockVoiceFailCustomOnce = false;
let mockChatterboxFail = false;

const app = createApp({
  enableRateLimit: false,
  getStripe: () => (stripeEnabled ? mockStripe : null),
  verifyGoogleToken: async (credential) => {
    if (credential === 'valid-google-token') {
      return { email: 'google.socio@espaciogym.mx', name: 'Google Socio' };
    }
    throw new Error('Invalid Google token');
  },
  fetchImpl: async (url, init) => {
    const urlStr = String(url);
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    voiceFetchCalls.push({ url: urlStr, method: init?.method || 'GET', body });

    if (urlStr.includes('/gradio_api/upload')) {
      if (mockChatterboxFail) {
        return new Response('Service Unavailable', { status: 503 });
      }
      return new Response(JSON.stringify(['/tmp/gradio/mock_ref.mp3']), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (urlStr.endsWith('/gradio_api/call/generate_tts_audio')) {
      if (mockChatterboxFail) {
        return new Response('Queue Full', { status: 503 });
      }
      return new Response(JSON.stringify({ event_id: 'evt_cb_01' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (urlStr.endsWith('/gradio_api/call/generate_tts_audio/evt_cb_01')) {
      const wavUrl =
        'https://resembleai-chatterbox-multilingual-tts-v3.hf.space/gradio_api/file=/tmp/gradio/out.wav';
      return new Response(
        `event: generating\ndata: null\n\nevent: complete\ndata: ${JSON.stringify([{ url: wavUrl }])}\n\n`,
        { status: 200, headers: { 'content-type': 'text/event-stream' } },
      );
    }

    if (urlStr.includes('/gradio_api/file=')) {
      return new Response(Buffer.from('CHATTERBOX_CLONED_WAV'), {
        status: 200,
        headers: { 'content-type': 'audio/wav' },
      });
    }

    if (urlStr.includes('/v1beta/voices')) {
      return new Response(
        JSON.stringify({
          id: 'voice_cloned_temach_01',
          display_name: body?.voice?.display_name || 'espacioGYM',
          sample_audio: {
            mime_type: 'audio/wav',
            data: Buffer.from('SAMPLE_WAV_PREVIEW').toString('base64'),
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    if (String(url).includes('/v1beta/interactions')) {
      const requestedVoice = body?.generation_config?.speech_config?.[0]?.voice;
      if (mockVoiceFailCustomOnce && requestedVoice === 'voice_cloned_temach_01') {
        mockVoiceFailCustomOnce = false;
        return new Response(
          JSON.stringify({ error: { message: 'Custom voice expired' } }),
          { status: 404, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          steps: [
            {
              type: 'model_output',
              content: [
                {
                  type: 'audio',
                  mime_type: 'audio/wav',
                  data: Buffer.from(`AUDIO:${requestedVoice}:${body?.model}`).toString('base64'),
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    throw new Error(`Unexpected mock fetch URL: ${url}`);
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

test('Coach Virtual TTS synthesis, voice cloning/design RBAC, caching & fallback', async () => {
  clearCoachVoiceCache();
  voiceFetchCalls.length = 0;

  assert.equal(
    limpiarTextoParaVoz('### **Modo Guerra**\n| Día | Ejercicio |\n|---|---|\n- Haz [sentadillas](https://example.com) con técnica.'),
    'Modo Guerra Haz sentadillas con técnica.',
  );

  // Unauthenticated & pure reception rejected
  assert.equal(
    (await api('/api/coach/tts', { method: 'POST', body: { coachId: 'temach', texto: 'Hola' } })).status,
    401,
  );

  const adminLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@gymseminario.com', password: 'AdminSeedTestPassword!' },
  });
  const adminToken = adminLogin.data.token;

  const recepReg = await api('/api/auth/register', {
    method: 'POST',
    body: { email: 'recep.voice@test.mx', password: 'Password123!', nombre: 'Recep Voice' },
  });
  await api('/api/auth/set-role', {
    method: 'POST',
    token: adminToken,
    body: { email: 'recep.voice@test.mx', role: 'reception' },
  });
  assert.equal(
    (
      await api('/api/coach/tts', {
        method: 'POST',
        token: recepReg.data.token,
        body: { coachId: 'temach', texto: 'Hola' },
      })
    ).status,
    403,
  );

  // Empty text rejected 400
  assert.equal(
    (
      await api('/api/coach/tts', {
        method: 'POST',
        token: adminToken,
        body: { coachId: 'temach', texto: '   ' },
      })
    ).status,
    400,
  );

  // Regular user cannot clone custom coach voices (403)
  const socioReg = await api('/api/auth/register', {
    method: 'POST',
    body: { email: 'socio.voice@test.mx', password: 'Password123!', nombre: 'Socio Voice' },
  });
  await api('/api/admin/memberships/assign', {
    method: 'POST',
    token: adminToken,
    body: { userEmail: 'socio.voice@test.mx', planNombre: 'Plan Pro', periodo: 'Mensual' },
  });
  assert.equal(
    (
      await api('/api/coach/voices/clone', {
        method: 'POST',
        token: socioReg.data.token,
        body: { coachId: 'temach', mode: 'prompted' },
      })
    ).status,
    403,
  );

  const prevKey = process.env.GEMINI_API_KEY;
  const prevLlave = process.env.GEMINI_LLAVE;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_LLAVE;
  mockChatterboxFail = false;

  try {
    // 0. Zero-shot Chatterbox cloning works with ZERO API keys + hits LRU cache
    const cbRes = await api('/api/coach/tts', {
      method: 'POST',
      token: socioReg.data.token,
      body: { coachId: 'temach', texto: '¡A darle con todo, mi compa!' },
    });
    assert.equal(cbRes.status, 200);
    assert.equal(cbRes.data.exito, true);
    assert.equal(cbRes.data.origen, 'chatterbox');
    assert.equal(cbRes.data.voiceUsed, 'chatterbox-temach');
    assert.equal(
      Buffer.from(cbRes.data.audioBase64, 'base64').toString('utf8'),
      'CHATTERBOX_CLONED_WAV',
    );
    const cbCallCount = voiceFetchCalls.length;

    const cbCached = await api('/api/coach/tts', {
      method: 'POST',
      token: socioReg.data.token,
      body: { coachId: 'temach', texto: '¡A darle con todo, mi compa!' },
    });
    assert.equal(cbCached.status, 200);
    assert.equal(cbCached.data.origen, 'cache');
    assert.equal(voiceFetchCalls.length, cbCallCount);

    // Enable Chatterbox failure + Gemini key to verify secondary Gemini 3.8 TTS & custom ID fallback
    mockChatterboxFail = true;
    process.env.GEMINI_API_KEY = 'test-gemini-voice-key';

    // 1. Subscribed user synthesizes speech with prebuilt coach persona + hits LRU cache on retry
    const tts1 = await api('/api/coach/tts', {
      method: 'POST',
      token: socioReg.data.token,
      body: { coachId: 'arnold', texto: '**Come with me** if you want to lift!' },
    });
    assert.equal(tts1.status, 200);
    assert.equal(tts1.data.exito, true);
    assert.equal(tts1.data.origen, 'gemini-tts');
    assert.equal(tts1.data.voiceUsed, 'Orus');
    assert.equal(tts1.data.mimeType, 'audio/wav');
    assert.equal(
      Buffer.from(tts1.data.audioBase64, 'base64').toString('utf8'),
      'AUDIO:Orus:gemini-3.8-flash-tts',
    );
    const callCountAfterFirst = voiceFetchCalls.length;

    const tts2 = await api('/api/coach/tts', {
      method: 'POST',
      token: socioReg.data.token,
      body: { coachId: 'arnold', texto: '**Come with me** if you want to lift!' },
    });
    assert.equal(tts2.status, 200);
    assert.equal(tts2.data.origen, 'cache');
    assert.equal(voiceFetchCalls.length, callCountAfterFirst);

    // 2. Admin clones/registers custom voice for Temach via Gemini Voices API -> subsequent TTS uses custom ID
    const cloneMissingConsent = await api('/api/coach/voices/clone', {
      method: 'POST',
      token: adminToken,
      body: { coachId: 'temach', mode: 'replicated', sourceAudioBase64: 'AAA=' },
    });
    assert.equal(cloneMissingConsent.status, 400);

    const cloneOk = await api('/api/coach/voices/clone', {
      method: 'POST',
      token: adminToken,
      body: {
        coachId: 'temach',
        mode: 'replicated',
        sourceAudioBase64: Buffer.from('REF_SPEAKER').toString('base64'),
        consentAudioBase64: Buffer.from('CONSENT_SPEAKER').toString('base64'),
      },
    });
    assert.equal(cloneOk.status, 200);
    assert.equal(cloneOk.data.exito, true);
    assert.equal(cloneOk.data.voiceId, 'voice_cloned_temach_01');

    const ttsCloned = await api('/api/coach/tts', {
      method: 'POST',
      token: socioReg.data.token,
      body: { coachId: 'temach', texto: 'Póngase en Modo Guerra, mi compa.' },
    });
    assert.equal(ttsCloned.status, 200);
    assert.equal(ttsCloned.data.exito, true);
    assert.equal(ttsCloned.data.voiceUsed, 'voice_cloned_temach_01');

    // 3. If custom voice returns 404, service gracefully falls back to coach's prebuilt Gemini voice
    mockVoiceFailCustomOnce = true;
    const ttsFallback = await api('/api/coach/tts', {
      method: 'POST',
      token: socioReg.data.token,
      body: { coachId: 'temach', texto: 'Cero excusas hoy en pierna.' },
    });
    assert.equal(ttsFallback.status, 200);
    assert.equal(ttsFallback.data.exito, true);
    assert.equal(ttsFallback.data.voiceUsed, 'Algenib');
  } finally {
    mockChatterboxFail = false;
    mockVoiceFailCustomOnce = false;
    clearCoachVoiceCache();
    if (prevKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevKey;
    if (prevLlave === undefined) delete process.env.GEMINI_LLAVE;
    else process.env.GEMINI_LLAVE = prevLlave;
  }
});

test('Personalized body-part coaches, no intro audio metadata, and user attendance/weight JSON context', async () => {
  const res = await api('/api/coaches');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data));

  for (const id of ['torso', 'pierna', 'core']) {
    const coach = res.data.find((c) => c.id === id);
    assert.ok(coach, `Expected custom coach ${id} in /api/coaches`);
    assert.equal(coach.personalizado, true);
    assert.equal(coach.hasIntroAudio, false);
    assert.equal(coach.hasVoice, false);
    assert.ok(typeof coach.especialidad === 'string' && coach.especialidad.length > 0);
    assert.match(COACHES[id].systemPrompt, /DATOS_REALES_USUARIO_JSON/);
    assert.match(COACHES[id].systemPrompt, /\|/);
  }

  const temach = res.data.find((c) => c.id === 'temach');
  assert.ok(temach);
  assert.equal(temach.personalizado, false);
  assert.equal(temach.hasIntroAudio, true);
  assert.equal(temach.hasVoice, true);

  const email = `telemetry_${Date.now()}@gymseminario.com`;
  db.prepare(
    'INSERT INTO attendances (clase, fecha, hora, qr_token, email) VALUES (?, ?, ?, ?, ?)'
  ).run('Fuerza', '2026-11-20', '18:00', `qr_${Date.now()}_1`, email);
  db.prepare(
    'INSERT INTO attendances (clase, fecha, hora, qr_token, email) VALUES (?, ?, ?, ?, ?)'
  ).run('HIIT', '2026-11-22', '19:00', `qr_${Date.now()}_2`, email);

  db.prepare(
    'INSERT INTO workout_logs (user_email, fecha, ejercicio, grupo_muscular, series, repeticiones, peso_kg, rpe) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(email, '2026-11-22', 'Press de banca', 'Pecho', 4, '10', 80, 8.5);
  db.prepare(
    'INSERT INTO workout_logs (user_email, fecha, ejercicio, grupo_muscular, series, repeticiones, peso_kg, rpe) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(email, '2026-11-21', 'Remo con barra', 'Espalda', 3, '12', 60, 8);

  const ctx = buildUserJsonContext({
    userEmail: email,
    perfilUsuario: {
      nombre: 'Yahir',
      edad: 23,
      peso: 76,
      altura: 176,
      objetivo: 'Ganancia muscular',
    },
    membresiaResumen: 'Plan Black',
    contextoRutina: 'Push/Pull/Legs',
  });

  assert.equal(ctx.asistencia.totalAsistencias, 2);
  assert.equal(ctx.recuentoPesoYEntrenamiento.totalRegistrosBitacora, 2);
  assert.equal(ctx.recuentoPesoYEntrenamiento.pesoTotalMovidoKg, 5360);
  assert.equal(ctx.recuentoPesoYEntrenamiento.pesoMaximoLevantadoKg, 80);
  assert.equal(ctx.recuentoPesoYEntrenamiento.ejercicioRecord, 'Press de banca');
  assert.equal(ctx.recuentoPesoYEntrenamiento.volumenPorGrupoMuscular.Pecho, 3200);
  assert.equal(ctx.recuentoPesoYEntrenamiento.volumenPorGrupoMuscular.Espalda, 2160);
});
