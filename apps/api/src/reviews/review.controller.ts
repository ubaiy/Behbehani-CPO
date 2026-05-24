/**
 * Customer reviews endpoints — mounted in app.ts at /v1/public and
 * /v1/public/listings respectively.
 *
 *   GET    /v1/public/me/reviews?page=1&pageSize=20          (auth required)
 *   GET    /v1/public/listings/:id/reviews?page=1&pageSize=20 (PUBLIC — no auth)
 *   POST   /v1/public/me/reviews                             (auth, Idempotency-Key)
 *   DELETE /v1/public/me/reviews/:id                         (auth required)
 *
 * Error envelope: { code, error } — locked per existing API convention.
 *
 * Status codes:
 *   AUTH_REQUIRED                 → 401
 *   TOKEN_INVALID                 → 401
 *   TOKEN_EXPIRED                 → 410
 *   REVIEW_NOT_FOUND              → 404
 *   REVIEW_TARGET_NOT_REVIEWABLE  → 403
 *   REVIEW_ALREADY_SUBMITTED      → 409
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireCustomerSession } from '../auth/require-customer-session';
import { CreateReviewInputSchema } from '@behbehani-cpo/shared-types';
import {
  ReviewError,
  createReview,
  deleteReview,
  listListingReviews,
  listMyReviews,
  mapReviewErrorToHttp,
} from './review.service';

// ─── Rate limiters ────────────────────────────────────────────────────────────

const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const publicMutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// ─── Shared pagination query schema ──────────────────────────────────────────

const PaginationQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Authenticated router (me/* routes) ──────────────────────────────────────

/**
 * Mounted at /v1/public in app.ts.
 * All routes in this router require a valid customer session.
 */
export const reviewMePublicRouter = Router();

// GET /v1/public/me/reviews
reviewMePublicRouter.get(
  '/me/reviews',
  requireCustomerSession,
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const { page, pageSize } = PaginationQuerySchema.parse(req.query);
      const result = await listMyReviews(req.customer!.id, { page, pageSize });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /v1/public/me/reviews
reviewMePublicRouter.post(
  '/me/reviews',
  requireCustomerSession,
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      const input          = CreateReviewInputSchema.parse(req.body);
      const idempotencyKey = (req.headers['idempotency-key'] as string | undefined) ?? null;
      const result         = await createReview(req.customer!.id, input, idempotencyKey);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof ReviewError) {
        const { status, body } = mapReviewErrorToHttp(err);
        res.status(status).json(body);
        return;
      }
      next(err);
    }
  },
);

// DELETE /v1/public/me/reviews/:id
reviewMePublicRouter.delete(
  '/me/reviews/:id',
  requireCustomerSession,
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      await deleteReview(req.params.id, req.customer!.id);
      res.status(204).send();
    } catch (err) {
      if (err instanceof ReviewError) {
        const { status, body } = mapReviewErrorToHttp(err);
        res.status(status).json(body);
        return;
      }
      next(err);
    }
  },
);

// ─── Public (no-auth) listings reviews router ─────────────────────────────────

/**
 * Mounted at /v1/public/listings in app.ts (same prefix as listingsPublicRouter).
 * GET /v1/public/listings/:id/reviews — no authentication required.
 */
export const reviewListingsPublicRouter = Router();

// GET /v1/public/listings/:id/reviews
reviewListingsPublicRouter.get(
  '/:id/reviews',
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const { page, pageSize } = PaginationQuerySchema.parse(req.query);
      const result = await listListingReviews(req.params.id, { page, pageSize });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
