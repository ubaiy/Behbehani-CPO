/**
 * Public offer-related router — mounted in app.ts.
 *
 * Owns the customer-facing surface of the Phase 4 Offer/Valuation flow:
 *
 *   GET  /v1/public/concierge/offers/:token              — read the offer
 *   POST /v1/public/concierge/offers/:token/respond      — accept / decline / counter
 *
 * Per CONCIERGE_INSPECTION_API_CONTRACT.md v1.0 §4, this controller is a
 * THIN pass-through over the `// public-shared` exports of offers.service.ts
 * (owned by session B). It contains no business logic, no Prisma queries, and
 * no domain rules — only Express plumbing: validation, rate limiting, request
 * metadata extraction, and a local error adapter for `OfferError`.
 *
 * Owned by session A (Phase 4 customer surface). Do not add admin-only branches here.
 *
 * Status codes (locked in v1.0 §3):
 *   NOT_FOUND          → 404  (no row matched the token)
 *   TOKEN_EXPIRED      → 410  (publicTokenExpiresAt < now)
 *   OFFER_WITHDRAWN    → 410  (admin pulled it back)
 *   ALREADY_RESPONDED  → 409  (customer already accepted / declined / countered)
 *   INVALID_COUNTER    → 422  (counter amount missing / non-positive)
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { CustomerOfferResponseSchema } from '@behbehani-cpo/shared-types';
import { OfferError } from './offers.errors';
import {
  getOfferByToken,
  submitCustomerResponse,
} from './offers.service';

export const offersPublicRouter = Router();

// ─── Router-local rate limiters ────────────────────────────────────────────
// Same cadence as inspections-public (v0.9 §2): 10 req/min on POST (the
// abuse-prone mutation path), 60 req/min on GET (offer page may be opened
// multiple times by the customer to deliberate).
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

// ─── GET /v1/public/concierge/offers/:token ────────────────────────────────
// Customer opens the offer link from their email/SMS. Service throws
// OfferError (NOT_FOUND | TOKEN_EXPIRED | OFFER_WITHDRAWN) on invalid states;
// the local adapter at the bottom formats the response. By design, accepted /
// declined / countered offers are NOT errors here — the page renders in a
// read-only "history" state per §16 D3 (publicTokenExpiresAt extends +30d
// after the response). Use `canRespond` in the response body to gate UI.

offersPublicRouter.get(
  '/concierge/offers/:token',
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const view = await getOfferByToken(req.params.token);
      res.json(view);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /v1/public/concierge/offers/:token/respond ───────────────────────
// Customer accepts / declines / counters. Service validates the action body
// via the shared discriminated union, runs the atomic acceptance flow on
// 'accept' (§16 D5 — creates a draft Listing), and audits in all cases.

offersPublicRouter.post(
  '/concierge/offers/:token/respond',
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      const dto = CustomerOfferResponseSchema.parse(req.body);
      const result = await submitCustomerResponse(req.params.token, dto, {
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
// Mirrors inspections-public.controller.ts. Catches domain-level OfferError
// instances and serialises to `{error, code}` with the right HTTP status.
// Anything else (ZodError, generic Error) falls through to the global
// errorHandler in middleware/error.ts.

offersPublicRouter.use(
  (
    err: unknown,
    _req: import('express').Request,
    res: import('express').Response,
    next: import('express').NextFunction,
  ) => {
    if (err instanceof OfferError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  },
);
