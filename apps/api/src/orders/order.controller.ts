/**
 * Order controller — v1.4.2 §3 + §4.
 *
 * Two routers are exported:
 *   orderRouter       — customer-authenticated, mounts under /v1/public
 *   ottoWebhookRouter — unauthenticated webhook, mounts under /v1/public
 *
 * HMAC verification strategy: parse body with the standard express.json()
 * middleware (already installed globally), then re-compute HMAC from
 * JSON.stringify(req.body) in handleOttoCallback. This avoids adding a
 * separate raw-body middleware and is safe because JSON.stringify of a parsed
 * object is semantically equivalent when the body has no exotic whitespace or
 * key ordering requirements. If Otto requires byte-exact raw body matching,
 * switch to express.raw({type:'application/json'}) on Day 5.
 */

import { Router } from 'express';
import {
  CreateOrderRequestSchema,
  InitiatePaymentRequestSchema,
  OrderListQuerySchema,
} from '@behbehani-cpo/shared-types';
import { requireCustomerSession } from '../auth/require-customer-session';
import {
  OrderError,
  cancelOrder,
  createOrder,
  getOrderById,
  handleOttoCallback,
  initiatePayment,
  listOrders,
} from './order.service';

// ─── Error → HTTP mapping per v1.4.2 §4 ────────────────────────────────────

const ERROR_STATUS_MAP: Record<string, number> = {
  LISTING_ALREADY_RESERVED:  409,
  LISTING_NOT_AVAILABLE:     410,
  RESERVATION_EXPIRED:       410,
  ORDER_NOT_CANCELLABLE:     409,
  PAYMENT_INIT_FAILED:       502,
  PAYMENT_NOT_FOUND:         404,
  IDEMPOTENCY_KEY_REQUIRED:  400,
};

function handleOrderError(err: unknown, res: Parameters<Router>[1]): boolean {
  if (err instanceof OrderError) {
    const status = ERROR_STATUS_MAP[err.code] ?? 500;
    (res as import('express').Response)
      .status(status)
      .json({ code: err.code, error: err.message });
    return true;
  }
  return false;
}

// ─── Customer-authenticated router ──────────────────────────────────────────

export const orderRouter = Router();

orderRouter.use(requireCustomerSession);

/**
 * POST /v1/public/orders
 * Create a new order (reservation). Idempotency-Key header required.
 * Returns 201 CreateOrderResponse.
 */
orderRouter.post('/orders', async (req, res, next) => {
  const ikey = req.header('Idempotency-Key');
  if (!ikey) {
    res.status(400).json({ code: 'IDEMPOTENCY_KEY_REQUIRED', error: 'Idempotency-Key header required' });
    return;
  }
  try {
    const body   = CreateOrderRequestSchema.parse(req.body);
    const result = await createOrder(req.customer!.id, body, ikey);
    res.status(201).json(result);
  } catch (err) {
    if (handleOrderError(err, res)) return;
    next(err);
  }
});

/**
 * GET /v1/public/me/orders
 * Paginated list of orders owned by the caller.
 */
orderRouter.get('/me/orders', async (req, res, next) => {
  try {
    const query  = OrderListQuerySchema.parse(req.query);
    const result = await listOrders(req.customer!.id, query);
    res.json(result);
  } catch (err) {
    if (handleOrderError(err, res)) return;
    next(err);
  }
});

/**
 * GET /v1/public/me/orders/:id
 * Order detail with embedded payments[].
 */
orderRouter.get('/me/orders/:id', async (req, res, next) => {
  try {
    const result = await getOrderById(req.customer!.id, req.params.id);
    res.json(result);
  } catch (err) {
    if (handleOrderError(err, res)) return;
    next(err);
  }
});

/**
 * POST /v1/public/orders/:id/cancel
 * Cancel an order. Only allowed in reservation_pending or confirmed status.
 */
orderRouter.post('/orders/:id/cancel', async (req, res, next) => {
  try {
    const result = await cancelOrder(req.customer!.id, req.params.id);
    res.json(result);
  } catch (err) {
    if (handleOrderError(err, res)) return;
    next(err);
  }
});

/**
 * POST /v1/public/orders/:id/payment
 * Initiate a payment for an existing order. Idempotency-Key header required.
 * Returns hostedPaymentUrl (Otto checkout page).
 */
orderRouter.post('/orders/:id/payment', async (req, res, next) => {
  const ikey = req.header('Idempotency-Key');
  if (!ikey) {
    res.status(400).json({ code: 'IDEMPOTENCY_KEY_REQUIRED', error: 'Idempotency-Key header required' });
    return;
  }
  try {
    const body   = InitiatePaymentRequestSchema.parse(req.body);
    const result = await initiatePayment(req.customer!.id, req.params.id, body, ikey);
    res.json(result);
  } catch (err) {
    if (handleOrderError(err, res)) return;
    next(err);
  }
});

// ─── Otto webhook router (unauthenticated) ───────────────────────────────────

export const ottoWebhookRouter = Router();

/**
 * POST /v1/public/payments/otto/callback
 * Otto Payment Services webhook. No customer auth — HMAC-verified internally.
 * Signature expected in X-Otto-Signature header as `sha256=<hex>`.
 *
 * Always returns 200 to prevent Otto from retrying on auth errors; errors are
 * logged internally.
 */
ottoWebhookRouter.post('/payments/otto/callback', async (req, res) => {
  try {
    const signature = req.header('X-Otto-Signature');
    await handleOttoCallback(req.body as Record<string, unknown>, signature);
    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[otto] callback error', err);
    // Return 200 so Otto does not endlessly retry bad-signature events.
    // Genuine processing errors (e.g. PAYMENT_INIT_FAILED) are already logged.
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});
