/**
 * Notifications inbox — service layer.
 *
 * v1.5 — customer in-app notification history.
 *
 * All mutations are ownership-checked: if the row exists but belongs to a
 * different userId, NOTIFICATION_NOT_FOUND is thrown (not 403) to avoid
 * leaking existence of other users' notifications.
 *
 * Server-side localization: toDto() resolves title/body from titleEn/titleAr
 * and bodyEn/bodyAr based on the caller-supplied locale ('en' | 'ar').
 */

import type {
  NotificationErrorCode,
  NotificationListResponse,
  NotificationSummaryDto,
} from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

// ─── Domain error ─────────────────────────────────────────────────────────────

export class NotificationInboxError extends Error {
  constructor(public readonly code: NotificationErrorCode, message: string) {
    super(message);
    this.name = 'NotificationInboxError';
  }
}

// ─── DTO mapper ───────────────────────────────────────────────────────────────

function toDto(
  row: {
    id: string;
    channel: string;
    category: string;
    titleEn: string;
    titleAr: string;
    bodyEn: string;
    bodyAr: string;
    deepLink: string | null;
    iconHint: string | null;
    readAt: Date | null;
    createdAt: Date;
    expiresAt: Date | null;
  },
  locale: 'en' | 'ar',
): NotificationSummaryDto {
  return {
    id:        row.id,
    channel:   row.channel as NotificationSummaryDto['channel'],
    category:  row.category as NotificationSummaryDto['category'],
    title:     locale === 'ar' ? row.titleAr : row.titleEn,
    body:      locale === 'ar' ? row.bodyAr  : row.bodyEn,
    deepLink:  row.deepLink,
    iconHint:  (row.iconHint as NotificationSummaryDto['iconHint']) ?? null,
    isRead:    row.readAt !== null,
    readAt:    row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Resolve User.locale from DB. Falls back to 'en' if user not found.
 */
async function resolveUserLocale(userId: string): Promise<'en' | 'ar'> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { locale: true },
  });
  return (user?.locale as 'en' | 'ar' | undefined) ?? 'en';
}

/**
 * Paginated list of a customer's notifications, newest first.
 * Expired rows (expiresAt < now) are hidden from the list.
 */
export async function listNotifications(
  userId: string,
  filter: { page: number; pageSize: number; unreadOnly: boolean },
): Promise<NotificationListResponse> {
  const page     = Math.max(1, Math.floor(filter.page));
  const pageSize = Math.max(1, Math.min(100, Math.floor(filter.pageSize)));
  const now      = new Date();

  const baseWhere = {
    userId,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    ...(filter.unreadOnly ? { readAt: null } : {}),
  };

  const unreadWhere = {
    userId,
    readAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };

  const [rows, total, unreadTotal, locale] = await Promise.all([
    prisma.notification.findMany({
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where: baseWhere }),
    prisma.notification.count({ where: unreadWhere }),
    resolveUserLocale(userId),
  ]);

  return {
    items:       rows.map((r) => toDto(r, locale)),
    total,
    unreadTotal,
    page,
    pageSize,
  };
}

/**
 * Lightweight unread-count for badge displays.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const now = new Date();
  return prisma.notification.count({
    where: {
      userId,
      readAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Mark a single notification as read. Idempotent — returns current state if
 * already read. Throws NOTIFICATION_NOT_FOUND if row doesn't exist or is owned
 * by a different user.
 */
export async function markAsRead(
  id: string,
  userId: string,
): Promise<NotificationSummaryDto> {
  const locale = await resolveUserLocale(userId);
  const existing = await prisma.notification.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new NotificationInboxError('NOTIFICATION_NOT_FOUND', 'Notification not found');
  }
  // Idempotent: if already read, return as-is without touching the DB.
  if (existing.readAt !== null) {
    return toDto(existing, locale);
  }
  const updated = await prisma.notification.update({
    where: { id },
    data:  { readAt: new Date() },
  });
  return toDto(updated, locale);
}

/**
 * Mark all of a customer's unread notifications as read in one call.
 * Returns the count of rows updated.
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data:  { readAt: new Date() },
  });
  return result.count;
}

/**
 * Hard-delete a notification. Ownership-checked.
 * Throws NOTIFICATION_NOT_FOUND if row doesn't exist or is owned by a
 * different user.
 */
export async function deleteNotification(id: string, userId: string): Promise<void> {
  const existing = await prisma.notification.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new NotificationInboxError('NOTIFICATION_NOT_FOUND', 'Notification not found');
  }
  await prisma.notification.delete({ where: { id } });
}

// ─── HTTP-mapping helper ──────────────────────────────────────────────────────

export function mapNotificationInboxErrorToHttp(err: NotificationInboxError): {
  status: number;
  body: { code: NotificationErrorCode; error: string };
} {
  const statusByCode: Record<NotificationErrorCode, number> = {
    NOTIFICATION_NOT_FOUND: 404,
  };
  return {
    status: statusByCode[err.code],
    body:   { code: err.code, error: err.message },
  };
}
