/**
 * Public inspection-related router — mounted in app.ts.
 *
 * Owns the customer-facing surface of the Concierge inspection workflow:
 *
 *   POST /v1/public/concierge/inspections       — create a booking
 *   GET  /v1/public/concierge/inspections/:ref  — booking-status tracker
 *   GET  /v1/public/inspection-sign/:token      — read summary for signing
 *   POST /v1/public/inspection-sign/:token      — submit customer signature
 *
 * Per CONCIERGE_INSPECTION_API_CONTRACT.md v0.7 §1, this controller is a
 * THIN pass-through over the `// public-shared` exports of inspections.service.ts
 * (owned by session B). It contains no business logic, no Prisma queries, and
 * no domain rules — only Express plumbing: validation, rate limiting, request
 * metadata extraction, and a local error adapter for `InspectionError`.
 *
 * Owned by session A. Do not add admin-only branches here.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  CreateConciergeInspectionSchema,
  CustomerSignSchema,
} from '@behbehani-cpo/shared-types';
import { InspectionError } from './inspections.errors';
import {
  createConciergeInspection,
  getInspectionByBookingRef,
  getInspectionBySignToken,
  submitCustomerSignature,
} from './inspections.service';

export const inspectionsPublicRouter = Router();

// ─── Router-local rate limiters ────────────────────────────────────────────
// 10 req/min/IP on POSTs (mirrors authLimiter cadence — these are abuse-prone
// mutation endpoints). 60 req/min/IP on GETs (tracker page polls every 30s).
const publicMutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// ─── POST /v1/public/concierge/inspections ─────────────────────────────────
// Customer submits the storefront wizard. Service reconciles the customer by
// mobile+email, mints a BMC-CON-NNNNNN bookingRef, persists the row, emits
// the create audit, and returns the confirmation payload.

inspectionsPublicRouter.post(
  '/concierge/inspections',
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      const dto = CreateConciergeInspectionSchema.parse(req.body);
      const result = await createConciergeInspection(dto, {
        // actorId is omitted intentionally: this is an unauthenticated public
        // endpoint. Audit will record actorId=null.
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /v1/public/concierge/inspections/:bookingRef ──────────────────────
// Customer-facing booking-status tracker — polled by /sell/concierge/status.
// Service returns null when the ref is unknown or refers to a CPO row; both
// cases surface to the customer as 404.

inspectionsPublicRouter.get(
  '/concierge/inspections/:bookingRef',
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const status = await getInspectionByBookingRef(req.params.bookingRef);
      if (!status) {
        throw new InspectionError(404, 'Booking not found', 'NOT_FOUND');
      }
      res.json(status);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /v1/public/inspection-sign/:token ─────────────────────────────────
// Customer opens the signing link from their SMS/email. Service throws
// InspectionError (NOT_FOUND | TOKEN_REVOKED | TOKEN_EXPIRED | ALREADY_SIGNED)
// on invalid states — the local adapter at the bottom formats the response.

inspectionsPublicRouter.get(
  '/inspection-sign/:token',
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const result = await getInspectionBySignToken(req.params.token);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /v1/public/inspection-sign/:token ────────────────────────────────
// Customer submits drawn signature + typed name. Service validates token,
// persists the signature artifacts, transitions status to `signed_off`, and
// emits the customer-signed audit entry. Same four InspectionError codes.

inspectionsPublicRouter.post(
  '/inspection-sign/:token',
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      const dto = CustomerSignSchema.parse(req.body);
      const result = await submitCustomerSignature(req.params.token, dto, {
        // `ip` is non-nullable on the service signature — fall back to '' if
        // Express can't derive one (shouldn't happen with trust proxy=1).
        ip: req.ip ?? '',
        userAgent: req.get('user-agent') ?? '',
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Local error adapter ───────────────────────────────────────────────────
// Mirrors the admin router pattern (apps/api/src/inspections/inspections.controller.ts).
// Catches domain-level InspectionError instances and serializes to `{error, code}`
// with the right HTTP status. Anything else (ZodError, generic Error) falls
// through to the global errorHandler in middleware/error.ts.

inspectionsPublicRouter.use(
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
