/**
 * Order service — v1.4.2 §3 + §4.
 *
 * State machine correctness + transactional atomicity are the primary concerns.
 * Otto Payment Services integration is MOCKED: a UUID is generated as the
 * ottoSessionId and the hosted checkout URL is fabricated locally.
 * Real Otto wiring lands on Day 5 once sandbox credentials are provisioned.
 */

import { createHmac, randomUUID } from 'node:crypto';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { send } from '../notifications/notification.service';
import { generateReceiptPdf } from './receipt-pdf.service';
import { putObjectToS3 } from '../lib/s3';
import type {
  CreateOrderRequestDto,
  CreateOrderResponseDto,
  InitiatePaymentRequestDto,
  InitiatePaymentResponseDto,
  OrderDetailDto,
  OrderErrorCode,
  OrderListQueryDto,
  OrderListResponseDto,
  OrderSummaryDto,
  PaymentSummaryDto,
} from '@behbehani-cpo/shared-types';

// ─── Error class ─────────────────────────────────────────────────────────────

export class OrderError extends Error {
  constructor(
    public readonly code: OrderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OrderError';
  }
}

// ─── DTO projectors ──────────────────────────────────────────────────────────

function toOrderSummary(row: {
  id: string;
  listingId: string;
  stockNumber: string;
  status: string;
  reservationAmountFils: bigint;
  totalAmountFils: bigint;
  paidAmountFils: bigint;
  reservationExpiresAt: Date;
  reservedAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
}): OrderSummaryDto {
  return {
    id:                    row.id,
    listingId:             row.listingId,
    stockNumber:           row.stockNumber,
    status:                row.status as OrderSummaryDto['status'],
    reservationAmountFils: row.reservationAmountFils.toString(),
    totalAmountFils:       row.totalAmountFils.toString(),
    paidAmountFils:        row.paidAmountFils.toString(),
    reservationExpiresAt:  row.reservationExpiresAt.toISOString(),
    reservedAt:            row.reservedAt.toISOString(),
    completedAt:           row.completedAt ? row.completedAt.toISOString() : null,
    cancelledAt:           row.cancelledAt ? row.cancelledAt.toISOString() : null,
  };
}

function toPaymentSummary(row: {
  id: string;
  amountFils: bigint;
  method: string;
  status: string;
  initiatedAt: Date;
  paidAt: Date | null;
  failedAt: Date | null;
  refundedAt: Date | null;
}): PaymentSummaryDto {
  return {
    id:          row.id,
    amountFils:  row.amountFils.toString(),
    method:      row.method as PaymentSummaryDto['method'],
    status:      row.status as PaymentSummaryDto['status'],
    initiatedAt: row.initiatedAt.toISOString(),
    paidAt:      row.paidAt ? row.paidAt.toISOString() : null,
    failedAt:    row.failedAt ? row.failedAt.toISOString() : null,
    refundedAt:  row.refundedAt ? row.refundedAt.toISOString() : null,
  };
}

// Reservation amount = 10% of listing price.
const RESERVATION_RATIO = 0.1;
// Reservation window = 24h.
const RESERVATION_HOURS = 24;

// ─── createOrder ─────────────────────────────────────────────────────────────

/**
 * Create a new order. Idempotent: if the idempotencyKey already exists, the
 * existing order is returned unchanged (safe for client retries).
 *
 * Contract v1.4.2 §3.
 */
export async function createOrder(
  customerId: string,
  input: CreateOrderRequestDto,
  idempotencyKey: string,
): Promise<CreateOrderResponseDto> {
  // 1. Idempotency check — return existing order if key already consumed.
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    return {
      order:                toOrderSummary(existing),
      reservationExpiresAt: existing.reservationExpiresAt.toISOString(),
    };
  }

  // 2. Find listing and validate status.
  const listing = await prisma.listing.findUnique({
    where: { id: input.listingId },
    select: { id: true, stockNumber: true, stage: true, priceFils: true },
  });
  if (!listing) {
    throw new OrderError('LISTING_NOT_AVAILABLE', 'Listing not found or not available');
  }
  if (listing.stage === 'reserved') {
    throw new OrderError('LISTING_ALREADY_RESERVED', 'Listing is already reserved by another customer');
  }
  if (listing.stage !== 'acquired' && listing.stage !== 'listed') {
    throw new OrderError('LISTING_NOT_AVAILABLE', `Listing is not available for purchase (stage: ${listing.stage})`);
  }

  // 3. Compute amounts.
  const reservationAmountFils = BigInt(Math.round(Number(listing.priceFils) * RESERVATION_RATIO));
  const totalAmountFils       = listing.priceFils;
  const now                   = new Date();
  const reservationExpiresAt  = new Date(now.getTime() + RESERVATION_HOURS * 60 * 60 * 1000);

  // 4. Transactional create: Order row + flip Listing.stage to 'reserved'.
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        customerId,
        listingId:             input.listingId,
        stockNumber:           listing.stockNumber,
        status:                'reservation_pending',
        reservationAmountFils,
        totalAmountFils,
        paidAmountFils:        BigInt(0),
        reservedAt:            now,
        reservationExpiresAt,
        idempotencyKey,
      },
    });

    await tx.listing.update({
      where: { id: input.listingId },
      data:  { stage: 'reserved', reservedAt: now },
    });

    return created;
  });

  return {
    order:                toOrderSummary(order),
    reservationExpiresAt: order.reservationExpiresAt.toISOString(),
  };
}

// ─── getOrderById ─────────────────────────────────────────────────────────────

/**
 * Return order detail (with payments[]) owned by the given customer.
 * Returns a 404-style error if not found or not owned by caller.
 */
export async function getOrderById(
  customerId: string,
  orderId: string,
): Promise<OrderDetailDto> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: { orderBy: { initiatedAt: 'asc' } } },
  });
  if (!order || order.customerId !== customerId) {
    throw new OrderError('PAYMENT_NOT_FOUND', 'Order not found');
  }
  return {
    ...toOrderSummary(order),
    payments: order.payments.map(toPaymentSummary),
  };
}

// ─── listOrders ──────────────────────────────────────────────────────────────

export async function listOrders(
  customerId: string,
  query: OrderListQueryDto,
): Promise<OrderListResponseDto> {
  const { page, pageSize } = query;
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where:   { customerId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.order.count({ where: { customerId } }),
  ]);

  return {
    items:    items.map(toOrderSummary),
    total,
    page,
    pageSize,
  };
}

// ─── cancelOrder ─────────────────────────────────────────────────────────────

/**
 * Cancel an order. Only allowed when status is 'reservation_pending' or
 * 'confirmed'. Atomically restores Listing.stage to 'acquired' if no other
 * live order holds the listing.
 */
export async function cancelOrder(
  customerId: string,
  orderId: string,
): Promise<OrderSummaryDto> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.customerId !== customerId) {
    throw new OrderError('PAYMENT_NOT_FOUND', 'Order not found');
  }
  if (order.status !== 'reservation_pending' && order.status !== 'confirmed') {
    throw new OrderError('ORDER_NOT_CANCELLABLE', `Order cannot be cancelled in status: ${order.status}`);
  }

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const cancelled = await tx.order.update({
      where: { id: orderId },
      data:  { status: 'cancelled', cancelledAt: now, cancellationReason: 'customer_cancelled' },
    });

    // Restore listing stage if no other active order holds it.
    const activeOrderCount = await tx.order.count({
      where: {
        listingId: order.listingId,
        status:    { in: ['reservation_pending', 'confirmed', 'payment_pending', 'paid'] },
      },
    });
    if (activeOrderCount === 0) {
      await tx.listing.update({
        where: { id: order.listingId },
        data:  { stage: 'acquired', reservedAt: null },
      });
    }

    return cancelled;
  });

  return toOrderSummary(updated);
}

// ─── initiatePayment ─────────────────────────────────────────────────────────

/**
 * Initiate a payment for an order via Otto Payment Services (MOCKED for Day 4).
 *
 * TODO Day 5: replace mock URL generation with real Otto session creation API
 * call using env.OTTO_API_KEY. The providerRef shape is already correct.
 */
export async function initiatePayment(
  customerId: string,
  orderId: string,
  input: InitiatePaymentRequestDto,
  idempotencyKey: string,
): Promise<InitiatePaymentResponseDto> {
  // 1. Find the order and verify ownership.
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.customerId !== customerId) {
    throw new OrderError('PAYMENT_NOT_FOUND', 'Order not found');
  }

  // 2. Check reservation window has not expired.
  if (new Date() > order.reservationExpiresAt) {
    throw new OrderError('RESERVATION_EXPIRED', 'Reservation window has expired');
  }

  // 3. Idempotency: return existing payment's hosted URL if key already used.
  if (idempotencyKey) {
    const existingPayment = await prisma.payment.findUnique({
      where: { idempotencyKey },
    });
    if (existingPayment && typeof existingPayment.providerRef === 'object' && existingPayment.providerRef !== null) {
      const ref = existingPayment.providerRef as Record<string, unknown>;
      const sessionId = ref['ottoSessionId'] as string;
      const baseUrl = env.OTTO_HOSTED_BASE_URL;
      return { hostedPaymentUrl: `${baseUrl}/${sessionId}` };
    }
  }

  // 4. Mock Otto session (TODO Day 5: call Otto /sessions API here).
  const ottoSessionId = randomUUID();
  const baseUrl       = env.OTTO_HOSTED_BASE_URL;
  const hostedPaymentUrl = `${baseUrl}/${ottoSessionId}`;

  const providerRef = {
    ottoSessionId,
    ottoTransactionId: null, // populated by Otto callback on success
    ottoRail:          input.method,
  };

  // 5. Create Payment row.
  await prisma.payment.create({
    data: {
      orderId:       order.id,
      amountFils:    order.totalAmountFils - order.paidAmountFils,
      method:        input.method,
      status:        'pending',
      providerRef,
      idempotencyKey: idempotencyKey || null,
    },
  });

  // 6. Move order to payment_pending if still at reservation_pending/confirmed.
  if (order.status === 'reservation_pending' || order.status === 'confirmed') {
    await prisma.order.update({
      where: { id: order.id },
      data:  { status: 'payment_pending' },
    });
  }

  return { hostedPaymentUrl };
}

// ─── handleOttoCallback ──────────────────────────────────────────────────────

/**
 * Handle Otto webhook callback.
 *
 * HMAC verification: uses OTTO_WEBHOOK_SECRET if set; logs and skips if empty
 * (dev/mock mode). Signature is expected in the 'X-Otto-Signature' header as
 * `sha256=<hex>`. Computed against JSON.stringify(body).
 *
 * TODO Day 5: confirm Otto's exact header name + signature format once sandbox
 * credentials are provisioned.
 */
export async function handleOttoCallback(
  body:      Record<string, unknown>,
  signature: string | undefined,
): Promise<void> {
  // 1. HMAC verification.
  if (env.OTTO_WEBHOOK_SECRET) {
    if (!signature) {
      // eslint-disable-next-line no-console
      console.warn('[otto] Missing X-Otto-Signature header — rejecting callback');
      throw new OrderError('PAYMENT_INIT_FAILED', 'Missing webhook signature');
    }
    const expected = `sha256=${createHmac('sha256', env.OTTO_WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest('hex')}`;
    if (signature !== expected) {
      // eslint-disable-next-line no-console
      console.warn('[otto] Invalid X-Otto-Signature — rejecting callback');
      throw new OrderError('PAYMENT_INIT_FAILED', 'Invalid webhook signature');
    }
  } else {
    // Dev / sandbox mode — skip HMAC verify and log.
    // eslint-disable-next-line no-console
    console.log('[otto] OTTO_WEBHOOK_SECRET not set — skipping HMAC verify (mock mode)');
  }

  // 2. Parse the payload. Expected shape from Otto spec (v1.4.2 §4):
  //    { event: 'payment.succeeded'|'payment.failed', sessionId, transactionId, amountFils }
  const event      = body['event'] as string;
  const sessionId  = body['sessionId'] as string;
  const txId       = body['transactionId'] as string | undefined;
  const amountFils = body['amountFils'] != null ? BigInt(body['amountFils'] as string | number) : null;

  if (!sessionId) {
    // eslint-disable-next-line no-console
    console.warn('[otto] Callback missing sessionId — ignoring');
    return;
  }

  // 3. Find the payment by providerRef.ottoSessionId.
  // Prisma JSON path filtering — cast to any[] for the findFirst.
  const payment = await prisma.payment.findFirst({
    where: {
      providerRef: { path: ['ottoSessionId'], equals: sessionId },
    },
    include: { order: true },
  });
  if (!payment) {
    // eslint-disable-next-line no-console
    console.warn(`[otto] No payment found for sessionId ${sessionId} — ignoring`);
    return;
  }

  const now = new Date();

  if (event === 'payment.succeeded') {
    // 4a. Success path — transactional update.
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data:  {
          status:       'succeeded',
          paidAt:       now,
          providerRef:  {
            ...(payment.providerRef as Record<string, unknown>),
            ottoTransactionId: txId ?? null,
          },
        },
      });

      const newPaid = payment.order.paidAmountFils + (amountFils ?? BigInt(0));
      await tx.order.update({
        where: { id: payment.orderId },
        data:  { status: 'paid', paidAmountFils: newPaid },
      });

      // Mark listing as sold.
      await tx.listing.update({
        where: { id: payment.order.listingId },
        data:  { stage: 'sold', soldAt: now },
      });
    });

    // 5. Generate receipt PDF + upload to S3 + create Document row (non-blocking).
    // Receipt failure must NOT roll back the payment success — log + continue.
    generateReceiptPdf({ orderId: payment.orderId, ottoTransactionId: txId })
      .then(async (receiptBytes) => {
        const fileKey = `orders/${payment.orderId}/receipt.pdf`;
        await putObjectToS3(fileKey, receiptBytes, 'application/pdf');
        await prisma.document.create({
          data: {
            customerId:    payment.order.customerId,
            kind:          'invoice',
            title:         `Receipt — order ${payment.order.stockNumber}`,
            fileKey,
            mimeType:      'application/pdf',
            fileSizeBytes: receiptBytes.length,
            orderId:       payment.orderId,
            uploadedById:  null, // system-generated
          },
        });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[order.service] receipt PDF gen failed', { orderId: payment.orderId, err });
        // Do NOT roll back payment — receipt is supplementary.
      });

    // 6. Dispatch booking-update notification (non-blocking — log errors only).
    send(payment.order.customerId, 'bookingUpdates', {
      title:    { en: 'Payment received', ar: 'تم استلام الدفع' },
      body:     { en: 'Your order is confirmed.', ar: 'تم تأكيد طلبك.' },
      // Mobile push handler expects full URL with `behbehani-motors://` scheme
      // (mobile IA drops the `/account` prefix that web uses). Per
      // MOBILE_API_CONTRACT.md §4 + v0.13 §2 (C fixed mobile scheme alignment).
      // Email/SMS adapter rendering will need to map this to web URLs when those
      // channels start consuming `deepLink` in v1.4.x — for now push is the only
      // channel routing on `data.deepLink`.
      deepLink: `behbehani-motors://orders/${payment.orderId}`,
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[otto] notification dispatch failed', err);
    });

  } else if (event === 'payment.failed') {
    // 4b. Failure path.
    await prisma.payment.update({
      where: { id: payment.id },
      data:  { status: 'failed', failedAt: now },
    });
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[otto] Unrecognised event type: ${event} — ignoring`);
  }
}
