import { z } from 'zod';

/** v1.4.2 §3 — customer order + payment DTOs. */

export const OrderStatusSchema = z.enum([
  'reservation_pending',
  'confirmed',
  'payment_pending',
  'paid',
  'delivery_scheduled',
  'delivered',
  'completed',
  'cancelled',
]);
export type OrderStatusValue = z.infer<typeof OrderStatusSchema>;

export const PaymentMethodSchema = z.enum([
  'knet',
  'card',
  'apple_pay',
  'google_pay',
  'bank_transfer',
  'financing',
  'cash_on_delivery',
]);
export type PaymentMethodValue = z.infer<typeof PaymentMethodSchema>;

export const PaymentStatusSchema = z.enum(['pending', 'succeeded', 'failed', 'refunded']);
export type PaymentStatusValue = z.infer<typeof PaymentStatusSchema>;

// ─── Create Order ────────────────────────────────────────────────────────────

export const CreateOrderRequestSchema = z.object({
  listingId:     z.string().uuid(),
  paymentMethod: PaymentMethodSchema,
});
export type CreateOrderRequestDto = z.infer<typeof CreateOrderRequestSchema>;

// ─── Payment summary (embedded in Order detail) ──────────────────────────────

export const PaymentSummarySchema = z.object({
  id:           z.string().uuid(),
  amountFils:   z.coerce.string(), // BigInt serialised as string
  method:       PaymentMethodSchema,
  status:       PaymentStatusSchema,
  initiatedAt:  z.string(),
  paidAt:       z.string().nullable(),
  failedAt:     z.string().nullable(),
  refundedAt:   z.string().nullable(),
});
export type PaymentSummaryDto = z.infer<typeof PaymentSummarySchema>;

// ─── Order summary (for list view) ───────────────────────────────────────────

export const OrderSummarySchema = z.object({
  id:                    z.string().uuid(),
  listingId:             z.string().uuid(),
  stockNumber:           z.string(),
  status:                OrderStatusSchema,
  reservationAmountFils: z.coerce.string(),
  totalAmountFils:       z.coerce.string(),
  paidAmountFils:        z.coerce.string(),
  reservationExpiresAt:  z.string(),
  reservedAt:            z.string(),
  completedAt:           z.string().nullable(),
  cancelledAt:           z.string().nullable(),
});
export type OrderSummaryDto = z.infer<typeof OrderSummarySchema>;

// ─── Order detail (with payments[]) ──────────────────────────────────────────

export const OrderDetailSchema = OrderSummarySchema.extend({
  payments: z.array(PaymentSummarySchema),
});
export type OrderDetailDto = z.infer<typeof OrderDetailSchema>;

// ─── Create Order response ────────────────────────────────────────────────────

export const CreateOrderResponseSchema = z.object({
  order:                OrderSummarySchema,
  reservationExpiresAt: z.string(),
});
export type CreateOrderResponseDto = z.infer<typeof CreateOrderResponseSchema>;

// ─── List Orders query + response ────────────────────────────────────────────

export const OrderListQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type OrderListQueryDto = z.infer<typeof OrderListQuerySchema>;

export const OrderListResponseSchema = z.object({
  items:    z.array(OrderSummarySchema),
  total:    z.number().int().nonnegative(),
  page:     z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type OrderListResponseDto = z.infer<typeof OrderListResponseSchema>;

// ─── Initiate payment ────────────────────────────────────────────────────────

export const InitiatePaymentRequestSchema = z.object({
  method: PaymentMethodSchema,
});
export type InitiatePaymentRequestDto = z.infer<typeof InitiatePaymentRequestSchema>;

export const InitiatePaymentResponseSchema = z.object({
  hostedPaymentUrl: z.string().url(),
});
export type InitiatePaymentResponseDto = z.infer<typeof InitiatePaymentResponseSchema>;

// ─── Locked error codes per v1.4.2 §4 ────────────────────────────────────────

export const ORDER_ERROR_CODES = [
  'LISTING_ALREADY_RESERVED',
  'LISTING_NOT_AVAILABLE',
  'RESERVATION_EXPIRED',
  'ORDER_NOT_CANCELLABLE',
  'PAYMENT_INIT_FAILED',
  'PAYMENT_NOT_FOUND',
  'IDEMPOTENCY_KEY_REQUIRED',
] as const;
export type OrderErrorCode = (typeof ORDER_ERROR_CODES)[number];
