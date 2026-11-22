import crypto from 'node:crypto';
import express from 'express';
import Stripe from 'stripe';
import db from '../services/db.js';
import {
  authGuard,
  optionalAuth,
  isReceptionOrAdminRole,
} from '../middleware/auth.middleware.js';

export const CUPONES_VALIDOS = {
  UAACOMITE: { porcentaje: 100, descripcion: 'Cortesía Institucional Comité Evaluador UAA' },
  COMITE: { porcentaje: 100, descripcion: 'Cortesía Institucional Comité Evaluador' },
  WACOMYT: { porcentaje: 100, descripcion: 'Cortesía Institucional Comité Evaluador' },
  WACOM: { porcentaje: 100, descripcion: 'Cortesía Institucional Comité Evaluador' },
  UAA: { porcentaje: 100, descripcion: 'Beca Universitaria UAA 100%' },
  COMITEUAA: { porcentaje: 100, descripcion: 'Cortesía Institucional Comité Evaluador UAA' },
  PROMO50: { porcentaje: 50, descripcion: 'Beca Deportiva 50%' },
  PROMO20: { porcentaje: 20, descripcion: 'Descuento Convenio Institucional 20%' },
  PROMO10: { porcentaje: 10, descripcion: 'Descuento Especial 10%' },
};

export function applyCouponDiscount(basePrice, couponCode) {
  const code = String(couponCode || '').trim().toUpperCase();
  const base = Number(basePrice);
  const safeBase = Number.isFinite(base) ? Math.max(0, base) : 0;
  if (!code || !CUPONES_VALIDOS[code]) {
    return {
      valid: false,
      codigo: code || null,
      cuponInfo: null,
      descuento: 0,
      finalPrice: Number(safeBase.toFixed(2)),
    };
  }
  const cuponInfo = CUPONES_VALIDOS[code];
  const descuento = Number(((safeBase * cuponInfo.porcentaje) / 100).toFixed(2));
  const finalPrice = Math.max(0, Number((safeBase - descuento).toFixed(2)));
  return {
    valid: true,
    codigo: code,
    cuponInfo,
    descuento,
    finalPrice,
  };
}

function resolveStripeOrderMeta(body = {}) {
  const { type, planNombre, description, orderSummary, descripcion, items } = body || {};
  const orderType = String(type || 'membership').toLowerCase().trim() === 'product' ? 'product' : 'membership';
  const itemsSummary =
    Array.isArray(items) && items.length > 0
      ? items
          .map((item) => `${item?.cantidad || item?.qty || item?.quantity || 1}x ${item?.nombre || item?.name || 'Producto'}`)
          .join(', ')
      : '';
  const orderDescription = String(
    planNombre || orderSummary || description || descripcion || itemsSummary || '',
  ).trim();
  return { orderType, orderDescription, items };
}

function resolveAuthoritativePrice(orderType, items, fallbackPrice) {
  if (orderType === 'product' && Array.isArray(items) && items.length > 0) {
    let total = 0;
    let allMatched = true;
    const stmt = db.prepare('SELECT precio FROM products WHERE id = ? AND activo = 1');
    for (const item of items) {
      const qty = Math.max(1, Number(item?.cantidad || item?.qty || item?.quantity || 1));
      const row = item?.id !== undefined ? stmt.get(Number(item.id)) : null;
      if (row) {
        total += Number(row.precio) * qty;
      } else {
        allMatched = false;
      }
    }
    if (allMatched && total > 0) {
      return Number(total.toFixed(2));
    }
  }
  const parsed = Number(fallbackPrice);
  return Number.isFinite(parsed) ? Math.max(0, Number(parsed.toFixed(2))) : 0;
}

function defaultGetStripe() {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) return null;
  return new Stripe(key);
}

export function createStripeRouter({ getStripe = defaultGetStripe } = {}) {
  const router = express.Router();

  router.post('/api/stripe/validate-coupon', (req, res) => {
    try {
      const body = req.body || {};
      const couponCode = body.couponCode ?? body.cupon;
      const result = applyCouponDiscount(body.precio || 0, couponCode);
      if (!result.valid) {
        return res.status(404).json({ ok: false, exito: false, error: 'Cupón no válido o expirado' });
      }
      return res.json({
        ok: true,
        exito: true,
        codigo: result.codigo,
        porcentaje: result.cuponInfo.porcentaje,
        descripcion: result.cuponInfo.descripcion,
        descuento: result.descuento,
        finalPrice: result.finalPrice,
        precioFinal: result.finalPrice,
      });
    } catch (err) {
      console.error('Error al validar cupón:', err);
      return res.status(500).json({ error: 'Error al validar cupón' });
    }
  });

  router.post('/api/stripe/create-payment-intent', optionalAuth, async (req, res) => {
    try {
      const body = req.body || {};
      const { planId, precio, amount, periodo, cupon } = body;
      const userEmail = (req.user?.email || body.userEmail || '').toString().toLowerCase().trim();
      const { orderType, orderDescription, items } = resolveStripeOrderMeta(body);
      const basePrice = resolveAuthoritativePrice(orderType, items, precio !== undefined ? precio : amount);

      if (!Number.isFinite(basePrice) || basePrice <= 0 || !orderDescription) {
        return res.status(400).json({ error: 'Faltan datos válidos de la orden' });
      }

      const discountResult = applyCouponDiscount(basePrice, cupon);
      if (cupon && !discountResult.valid) {
        return res.status(400).json({ error: 'El cupón proporcionado no es válido.' });
      }
      const precioFinal = discountResult.finalPrice;
      const cuponAplicado = discountResult.valid ? discountResult.codigo : null;

      if (precioFinal === 0) {
        const freeId = `pi_free_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        return res.json({
          ok: true,
          exito: true,
          freeCoupon: true,
          freePass: true,
          type: orderType,
          precioFinal: 0,
          finalPrice: 0,
          descuento: discountResult.descuento,
          cupon: cuponAplicado,
          paymentIntentId: freeId,
          clientSecret: null,
          currency: 'mxn',
        });
      }

      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({
          ok: false,
          exito: false,
          error: 'Pasarela Stripe no configurada en el servidor (STRIPE_SECRET_KEY requerida).',
        });
      }

      const amountInCents = Math.round(precioFinal * 100);
      const stripeDescription =
        orderType === 'product'
          ? `Tienda espacioGYM - ${orderDescription}`
          : `Membresía espacioGYM - ${orderDescription} (${periodo || 'Mensual'})`;

      const pi = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'mxn',
        automatic_payment_methods: { enabled: true },
        description: stripeDescription,
        ...(userEmail ? { receipt_email: userEmail } : {}),
        metadata: {
          type: orderType,
          userEmail: userEmail || '',
          planNombre: orderDescription,
          ...(orderType !== 'product' ? { periodo: periodo || 'Mensual' } : {}),
          ...(planId ? { planId: String(planId) } : {}),
          ...(cuponAplicado ? { cupon: cuponAplicado } : {}),
        },
      });

      return res.json({
        ok: true,
        exito: true,
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
        amount: pi.amount,
        currency: pi.currency,
        precioFinal,
        finalPrice: precioFinal,
        descuento: discountResult.descuento,
        cupon: cuponAplicado,
        type: orderType,
      });
    } catch (err) {
      console.error('Error al crear PaymentIntent con Stripe:', err);
      return res.status(500).json({ error: err?.message || 'Error al iniciar pago con Stripe' });
    }
  });

  router.post('/api/stripe/confirm-payment', optionalAuth, async (req, res) => {
    try {
      const body = req.body || {};
      const {
        paymentIntentId,
        precio,
        periodo,
        cupon,
        payerName,
        payerEmail,
        beneficios,
        autoRenew,
      } = body;

      const { orderType, orderDescription, items } = resolveStripeOrderMeta(body);
      const rawEmail = (req.user?.email || body.userEmail || payerEmail || '').toString().toLowerCase().trim();
      const resolvedEmail = rawEmail || (orderType === 'product' ? 'cliente@espaciogym.com' : '');

      if (!orderDescription || !resolvedEmail) {
        return res.status(400).json({ error: 'Datos de confirmación incompletos' });
      }

      const basePrice = resolveAuthoritativePrice(orderType, items, precio ?? body.finalPrice ?? 0);
      const discountResult = applyCouponDiscount(basePrice, cupon);
      if (cupon && !discountResult.valid) {
        return res.status(400).json({ error: 'El cupón aplicado no es válido.' });
      }

      const precioFinal = discountResult.finalPrice;
      const descuento = discountResult.descuento;
      const cuponAplicado = discountResult.valid ? discountResult.codigo : null;

      let piId = String(paymentIntentId || '').trim();

      if (precioFinal === 0) {
        if (!cuponAplicado || discountResult.cuponInfo?.porcentaje !== 100) {
          return res.status(400).json({
            ok: false,
            exito: false,
            error: 'Se requiere un cupón válido del 100% para confirmar un pago en $0.00 MXN.',
          });
        }
        if (!piId || !piId.startsWith('pi_free_')) {
          piId = `pi_free_${Date.now()}`;
        }
      } else {
        if (!piId || piId.startsWith('pi_live_') || piId.startsWith('pi_free_')) {
          return res.status(400).json({
            ok: false,
            exito: false,
            error: 'Se requiere un paymentIntentId real verificado en Stripe.',
          });
        }
        const stripe = getStripe();
        if (!stripe) {
          return res.status(503).json({
            ok: false,
            exito: false,
            error: 'Pasarela Stripe no configurada en el servidor (STRIPE_SECRET_KEY requerida).',
          });
        }

        const pi = await stripe.paymentIntents.retrieve(piId);
        if (!pi || pi.status !== 'succeeded') {
          return res.status(400).json({
            ok: false,
            exito: false,
            error: `El pago en Stripe no está completado (estado: ${pi?.status || 'desconocido'}).`,
          });
        }

        const expectedCents = Math.round(precioFinal * 100);
        if (Math.abs(Number(pi.amount) - expectedCents) > 1) {
          return res.status(400).json({
            ok: false,
            exito: false,
            error: 'El monto confirmado en Stripe no coincide con el total de la orden.',
          });
        }
      }

      const folioPago = `STR-${crypto.randomInt(100000, 999999)}`;
      const transId = `STX-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;

      const persistResult = db.transaction(() => {
        db.prepare(`
          INSERT INTO stripe_transactions (
            id, folio, payment_intent_id, tipo, user_email, plan_nombre, monto, descuento,
            cupon, moneda, estado, payer_name, payer_email, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'MXN', 'COMPLETED', ?, ?, datetime('now'))
        `).run(
          transId,
          folioPago,
          piId,
          orderType,
          resolvedEmail,
          orderDescription,
          precioFinal,
          descuento,
          cuponAplicado,
          payerName || req.user?.nombre || 'Socio espacioGYM',
          payerEmail || resolvedEmail,
        );

        if (orderType === 'product') {
          return null;
        }

        const hoy = new Date();
        const meses = periodo === 'Anual' ? 12 : periodo === 'Trimestral' ? 3 : 1;
        const fechaFin = new Date(hoy);
        fechaFin.setMonth(fechaFin.getMonth() + meses);

        const pad = (n) => String(n).padStart(2, '0');
        const fInicioStr = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;
        const fFinStr = `${fechaFin.getFullYear()}-${pad(fechaFin.getMonth() + 1)}-${pad(fechaFin.getDate())}`;
        const memId = `MEM-${crypto.randomInt(100000, 999999)}`;
        const beneficiosJson = JSON.stringify(
          beneficios || [
            'Acceso total a gimnasio y vestidores',
            'Coach Virtual IA ilimitado',
            'Generación de código QR para asistencia',
          ],
        );

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
        `).run(
          memId,
          resolvedEmail,
          orderDescription,
          precioFinal,
          periodo || 'Mensual',
          fInicioStr,
          fFinStr,
          autoRenew ? 1 : 0,
          beneficiosJson,
        );

        const histId = `MH-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
        db.prepare(`
          INSERT INTO membership_history (
            id, membership_id, user_email, plan_nombre, precio, periodo, fecha_inicio, fecha_fin, accion, folio, cupon, actor_email
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVACION', ?, ?, ?)
        `).run(
          histId,
          memId,
          resolvedEmail,
          orderDescription,
          precioFinal,
          periodo || 'Mensual',
          fInicioStr,
          fFinStr,
          folioPago,
          cuponAplicado,
          resolvedEmail,
        );

        db.prepare("UPDATE users SET role = 'subscriber' WHERE lower(email) = lower(?) AND role = 'user'").run(
          resolvedEmail,
        );

        return {
          id: memId,
          nombrePlan: orderDescription,
          periodo: periodo || 'Mensual',
          fechaInicio: fInicioStr,
          fechaFin: fFinStr,
          estado: 'Activa',
          autoRenew: Boolean(autoRenew),
        };
      })();

      if (orderType === 'product') {
        return res.json({
          ok: true,
          exito: true,
          type: 'product',
          mensaje: 'Compra de productos con Stripe procesada exitosamente',
          folio: folioPago,
          transaccionId: transId,
          paymentIntentId: piId,
          descripcion: orderDescription,
          montoPagado: precioFinal,
          precioFinal,
          descuento,
          cupon: cuponAplicado,
          items: Array.isArray(items) ? items : undefined,
        });
      }

      return res.json({
        ok: true,
        exito: true,
        type: 'membership',
        mensaje: 'Pago con Stripe procesado exitosamente y membresía activada',
        folio: folioPago,
        transaccionId: transId,
        paymentIntentId: piId,
        montoPagado: precioFinal,
        precioFinal,
        descuento,
        cupon: cuponAplicado,
        membresia: persistResult,
      });
    } catch (err) {
      console.error('Error al confirmar pago con Stripe:', err);
      return res.status(500).json({ error: err?.message || 'Error al procesar la confirmación con Stripe' });
    }
  });

  router.get('/api/stripe/transactions', authGuard, (req, res) => {
    try {
      const requestedEmail = req.query.email ? String(req.query.email).toLowerCase().trim() : '';
      const isStaff = isReceptionOrAdminRole(req.user);

      let query = 'SELECT * FROM stripe_transactions WHERE lower(user_email) = lower(?) ORDER BY datetime(created_at) DESC';
      let params = [req.user.email];

      if (isStaff) {
        if (requestedEmail) {
          params = [requestedEmail];
        } else {
          query = 'SELECT * FROM stripe_transactions ORDER BY datetime(created_at) DESC';
          params = [];
        }
      }

      const rows = db.prepare(query).all(...params);
      return res.json(rows);
    } catch (err) {
      console.error('Error al consultar transacciones de Stripe:', err);
      return res.status(500).json({ error: 'Error al consultar transacciones' });
    }
  });

  return router;
}
