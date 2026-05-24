/**
 * v1.5.13 (closes [ASK C→B] from MOBILE_API_CONTRACT.md v0.22 §3):
 *
 * Auth-required customer-scoped sell-bookings endpoints — companion to the
 * existing no-auth public tracker at `/v1/public/concierge/inspections/:ref`.
 * Mounted in app.ts at `/v1/public/me/sell-bookings`.
 *
 *   GET   /v1/public/me/sell-bookings?page=1&pageSize=20          — list my own
 *   GET   /v1/public/me/sell-bookings/:bookingRef                  — one of mine (404 if not owned)
 *   PATCH /v1/public/me/sell-bookings/:bookingRef                  — reschedule (draft-only)
 *   POST  /v1/public/me/sell-bookings/:bookingRef/cancel           — cancel (draft-only, idempotent)
 *
 * Status codes:
 *   AUTH_REQUIRED              → 401
 *   TOKEN_INVALID              → 401
 *   TOKEN_EXPIRED              → 410
 *   BOOKING_NOT_FOUND          → 404  (unknown ref / not owned / non-concierge)
 *   BOOKING_NOT_RESCHEDULABLE  → 409  (reschedule: status past 'draft')
 *   BOOKING_NOT_CANCELLABLE    → 409  (cancel: status past 'draft')
 *   VALIDATION_ERROR           → 422  (Zod fail — bad date / missing window / reason > 200 chars)
 *
 * IMPORTANT mount-order note: this router MUST be mounted before meAccountRouter
 * in app.ts per memory `feedback_express_middleware_order_trap` — meAccountRouter
 * applies `router.use(requireCustomerSession)` on the broad `/v1/public` prefix,
 * but this router also uses `requireCustomerSession`, so the effective behavior
 * is the same. Order matters only for routers that share the broad prefix AND
 * have no own auth.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import {
  RescheduleSellBookingInputSchema,
  CancelSellBookingInputSchema,
} from '@behbehani-cpo/shared-types';
import { requireCustomerSession } from '../auth/require-customer-session';
import { InspectionError } from './inspections.errors';
import {
  listMySellBookings,
  getMySellBookingByRef,
  rescheduleMySellBooking,
  cancelMySellBooking,
} from './inspections.service';

export const meSellBookingsRouter = Router();

// All routes on this router require a customer session.
meSellBookingsRouter.use(requireCustomerSession);

const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const publicMutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── GET /v1/public/me/sell-bookings ───────────────────────────────────────

meSellBookingsRouter.get(
  '/me/sell-bookings',
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const { page, pageSize } = PaginationQuerySchema.parse(req.query);
      const result = await listMySellBookings(req.customer!.id, { page, pageSize });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /v1/public/me/sell-bookings/:bookingRef ───────────────────────────

meSellBookingsRouter.get(
  '/me/sell-bookings/:bookingRef',
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const result = await getMySellBookingByRef(req.customer!.id, req.params.bookingRef);
      if (!result) {
        throw new InspectionError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /v1/public/me/sell-bookings/:bookingRef ─────────────────────────

meSellBookingsRouter.patch(
  '/me/sell-bookings/:bookingRef',
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      const dto = RescheduleSellBookingInputSchema.parse(req.body);
      const result = await rescheduleMySellBooking(
        req.customer!.id,
        req.params.bookingRef,
        dto,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /v1/public/me/sell-bookings/:bookingRef/cancel ──────────────────
//
// v1.5.14 — closes [ASK A→B-3] (CONCIERGE_INSPECTION_API_CONTRACT.md v1.5-D10 §3).
// A's spec uses path /v1/public/concierge/bookings/:ref/cancel; this session
// mounts on the me-scoped router at /v1/public/me/sell-bookings/:bookingRef/cancel
// for consistency with reschedule. Both can be wired if A needs the concierge
// path too — add a second mount pointing to the same handler.
//
// Status codes:
//   AUTH_REQUIRED              → 401  (requireCustomerSession middleware)
//   TOKEN_INVALID              → 401
//   TOKEN_EXPIRED              → 410
//   BOOKING_NOT_FOUND          → 404  (unknown / not owned / non-concierge)
//   BOOKING_NOT_CANCELLABLE    → 409  (status past 'draft')
//   VALIDATION_ERROR           → 422  (Zod — reason > 200 chars)

meSellBookingsRouter.post(
  '/me/sell-bookings/:bookingRef/cancel',
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      const dto = CancelSellBookingInputSchema.parse(req.body);
      const result = await cancelMySellBooking(req.customer!.id, req.params.bookingRef, dto);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Local error adapter ───────────────────────────────────────────────────
// Mirrors inspections-public.controller.ts pattern. Catches InspectionError
// instances thrown by the service and serializes to `{ error, code }` with
// the right HTTP status. ZodError + generic errors fall through to the
// global errorHandler.

meSellBookingsRouter.use(
  (
    err: unknown,
    _req: import('express').Request,
    res: import('express').Response,
    next: import('express').NextFunction,
  ) => {
    if (err instanceof InspectionError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  },
);
