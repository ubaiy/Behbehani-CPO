/**
 * Customer saved-listings endpoints — mounted in app.ts at /v1/public.
 *
 *   GET    /v1/public/me/saved-listings?page=1&pageSize=20             — list
 *   POST   /v1/public/me/saved-listings/:listingId                     — save
 *   DELETE /v1/public/me/saved-listings/:listingId                     — unsave
 *   GET    /v1/public/me/saved-listings/check?listingIds=id1,id2,...   — bulk presence
 *
 * All routes require a valid customer session (Bearer JWT). Idempotent
 * save/unsave per B's v1.2.1 §4.6 — only LISTING_NOT_FOUND throws.
 *
 * Status codes (locked in v1.2.0 §5):
 *   AUTH_REQUIRED      → 401
 *   TOKEN_INVALID      → 401
 *   TOKEN_EXPIRED      → 410
 *   LISTING_NOT_FOUND  → 404
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireCustomerSession } from '../auth/require-customer-session';
import {
  SavedListingError,
  checkSavedListings,
  getSavedListingsForCustomer,
  mapSavedListingErrorToHttp,
  saveListing,
  unsaveListing,
} from './saved-listings.service';

export const savedListingsPublicRouter = Router();

const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const publicMutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Comma-separated list of UUIDs, capped at 50 per B's CheckSavedListingsQuerySchema.
const CheckQuerySchema = z.object({
  listingIds: z
    .string()
    .min(1)
    .transform((s) => s.split(',').map((id) => id.trim()).filter(Boolean))
    .refine((ids) => ids.length <= 50, { message: 'Up to 50 listingIds per request' })
    .refine((ids) => ids.every((id) => /^[0-9a-f-]{36}$/i.test(id)), { message: 'Invalid listing UUID' }),
});

// ─── GET /v1/public/me/saved-listings ──────────────────────────────────────

// IMPORTANT: declare the /check sub-route BEFORE the parameterised :listingId
// routes so Express doesn't match "check" as a listingId.
savedListingsPublicRouter.get(
  '/me/saved-listings/check',
  requireCustomerSession,
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const { listingIds } = CheckQuerySchema.parse(req.query);
      const result = await checkSavedListings(req.customer!.id, listingIds);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

savedListingsPublicRouter.get(
  '/me/saved-listings',
  requireCustomerSession,
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const { page, pageSize } = PaginationQuerySchema.parse(req.query);
      const result = await getSavedListingsForCustomer(req.customer!.id, { page, pageSize });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

savedListingsPublicRouter.post(
  '/me/saved-listings/:listingId',
  requireCustomerSession,
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      const result = await saveListing(req.customer!.id, req.params.listingId, {
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(result);
    } catch (err) {
      if (err instanceof SavedListingError) {
        const { status, body } = mapSavedListingErrorToHttp(err);
        res.status(status).json(body);
        return;
      }
      next(err);
    }
  },
);

savedListingsPublicRouter.delete(
  '/me/saved-listings/:listingId',
  requireCustomerSession,
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      // unsave is idempotent — non-existent row returns { removed: false } (no throw).
      const result = await unsaveListing(req.customer!.id, req.params.listingId);
      res.json(result);
    } catch (err) {
      if (err instanceof SavedListingError) {
        const { status, body } = mapSavedListingErrorToHttp(err);
        res.status(status).json(body);
        return;
      }
      next(err);
    }
  },
);
