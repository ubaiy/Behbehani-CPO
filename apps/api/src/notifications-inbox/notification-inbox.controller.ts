/**
 * Customer notifications-inbox endpoints — mounted in app.ts at /v1/public.
 *
 *   GET    /v1/public/me/notifications?page=1&pageSize=20&unreadOnly=false
 *   GET    /v1/public/me/notifications/unread-count
 *   POST   /v1/public/me/notifications/:id/read
 *   POST   /v1/public/me/notifications/read-all
 *   DELETE /v1/public/me/notifications/:id
 *
 * All routes require a valid customer session (Bearer JWT).
 * Error envelope: { code, error } — locked per existing API convention.
 *
 * Status codes:
 *   AUTH_REQUIRED          → 401
 *   TOKEN_INVALID          → 401
 *   TOKEN_EXPIRED          → 410
 *   NOTIFICATION_NOT_FOUND → 404
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireCustomerSession } from '../auth/require-customer-session';
import {
  NotificationInboxError,
  deleteNotification,
  getUnreadCount,
  listNotifications,
  mapNotificationInboxErrorToHttp,
  markAllAsRead,
  markAsRead,
} from './notification-inbox.service';

export const notificationInboxPublicRouter = Router();

const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const publicMutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const ListQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  pageSize:   z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((v) => v === true || v === 'true')
    .default('false'),
});

// ─── GET /v1/public/me/notifications ─────────────────────────────────────────

notificationInboxPublicRouter.get(
  '/me/notifications',
  requireCustomerSession,
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const { page, pageSize, unreadOnly } = ListQuerySchema.parse(req.query);
      const result = await listNotifications(
        req.customer!.id,
        { page, pageSize, unreadOnly },
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /v1/public/me/notifications/unread-count ────────────────────────────

notificationInboxPublicRouter.get(
  '/me/notifications/unread-count',
  requireCustomerSession,
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const count = await getUnreadCount(req.customer!.id);
      res.json({ count });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /v1/public/me/notifications/read-all ───────────────────────────────
// NOTE: mounted before /:id/read so the literal segment "read-all" wins.

notificationInboxPublicRouter.post(
  '/me/notifications/read-all',
  requireCustomerSession,
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      const updated = await markAllAsRead(req.customer!.id);
      res.json({ updated });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /v1/public/me/notifications/:id/read ───────────────────────────────

notificationInboxPublicRouter.post(
  '/me/notifications/:id/read',
  requireCustomerSession,
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      const result = await markAsRead(req.params.id, req.customer!.id);
      res.json(result);
    } catch (err) {
      if (err instanceof NotificationInboxError) {
        const { status, body } = mapNotificationInboxErrorToHttp(err);
        res.status(status).json(body);
        return;
      }
      next(err);
    }
  },
);

// ─── DELETE /v1/public/me/notifications/:id ──────────────────────────────────

notificationInboxPublicRouter.delete(
  '/me/notifications/:id',
  requireCustomerSession,
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      await deleteNotification(req.params.id, req.customer!.id);
      res.status(204).send();
    } catch (err) {
      if (err instanceof NotificationInboxError) {
        const { status, body } = mapNotificationInboxErrorToHttp(err);
        res.status(status).json(body);
        return;
      }
      next(err);
    }
  },
);
