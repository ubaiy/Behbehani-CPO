import { z } from 'zod';
import { OrderStatusSchema, OrderSummarySchema, OrderDetailSchema } from './order.public.schemas.js';

/** v1.4.2 §5 — admin order queue DTOs. */

// ─── List query ──────────────────────────────────────────────────────────────

export const AdminOrderListQuerySchema = z.object({
  status:     OrderStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  page:       z.coerce.number().int().min(1).default(1),
  pageSize:   z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminOrderListQueryDto = z.infer<typeof AdminOrderListQuerySchema>;

// ─── List response ───────────────────────────────────────────────────────────

export const AdminOrderListResponseSchema = z.object({
  items:    z.array(OrderSummarySchema),
  total:    z.number().int().nonnegative(),
  page:     z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type AdminOrderListResponseDto = z.infer<typeof AdminOrderListResponseSchema>;

// ─── Status update ───────────────────────────────────────────────────────────

export const AdminOrderStatusUpdateSchema = z.object({
  status: z.enum(['delivery_scheduled', 'delivered', 'completed']),
  note:   z.string().max(500).optional(),
});
export type AdminOrderStatusUpdateDto = z.infer<typeof AdminOrderStatusUpdateSchema>;

// ─── Cancel order ────────────────────────────────────────────────────────────

export const AdminOrderCancelSchema = z.object({
  reason: z.string().min(3).max(500),
});
export type AdminOrderCancelDto = z.infer<typeof AdminOrderCancelSchema>;

// ─── Error codes ─────────────────────────────────────────────────────────────

export const ADMIN_ORDER_ERROR_CODES = [
  'ORDER_NOT_FOUND',
  'INVALID_STATUS_TRANSITION',
  'ORDER_ALREADY_TERMINAL',
] as const;
export type AdminOrderErrorCode = (typeof ADMIN_ORDER_ERROR_CODES)[number];

// Re-export detail type for convenience
export type { OrderDetailDto, OrderSummaryDto } from './order.public.schemas.js';
