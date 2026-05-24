import { z } from 'zod';

/**
 * Notifications inbox — public DTOs.
 *
 * v1.5 — customer in-app notification history for /v1/public/me/notifications.
 *
 * Service + controller live in apps/api/src/notifications-inbox/.
 * title/body are pre-localized server-side per User.locale — mobile does NOT
 * translate. Storage columns are titleEn/titleAr/bodyEn/bodyAr; the DTO
 * surfaces single title/body strings resolved at query time.
 */

// ─── Enum schemas ─────────────────────────────────────────────────────────────

export const NotificationChannelSchema = z.enum(['push', 'email', 'sms', 'inApp']);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const NotificationCategorySchema = z.enum([
  'order',
  'offer',
  'inspection',
  'document',
  'maintenance',
  'system',
  'marketing',
]);
export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;

export const NotificationIconHintSchema = z.enum([
  'order',
  'offer',
  'inspection',
  'doc',
  'system',
]);
export type NotificationIconHint = z.infer<typeof NotificationIconHintSchema>;

// ─── Summary DTO (single notification as returned by list + read endpoints) ───

export const NotificationSummaryDtoSchema = z.object({
  id:        z.string(),
  channel:   NotificationChannelSchema,
  category:  NotificationCategorySchema,
  /** Pre-localized per User.locale (en | ar). */
  title:     z.string(),
  /** Pre-localized per User.locale (en | ar). */
  body:      z.string(),
  deepLink:  z.string().nullable(),
  iconHint:  NotificationIconHintSchema.nullable(),
  isRead:    z.boolean(),
  readAt:    z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
});

export type NotificationSummaryDto = z.infer<typeof NotificationSummaryDtoSchema>;

// ─── Paginated list response ──────────────────────────────────────────────────

export const NotificationListResponseSchema = z.object({
  items:       z.array(NotificationSummaryDtoSchema),
  total:       z.number().int().min(0),
  unreadTotal: z.number().int().min(0),
  page:        z.number().int().min(1),
  pageSize:    z.number().int().min(1),
});

export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;

// ─── Unread-count response ────────────────────────────────────────────────────

export const UnreadCountResponseSchema = z.object({
  count: z.number().int().min(0),
});

export type UnreadCountResponse = z.infer<typeof UnreadCountResponseSchema>;

// ─── Error codes ──────────────────────────────────────────────────────────────

export const NOTIFICATION_ERROR_CODES = ['NOTIFICATION_NOT_FOUND'] as const;
export type NotificationErrorCode = (typeof NOTIFICATION_ERROR_CODES)[number];
