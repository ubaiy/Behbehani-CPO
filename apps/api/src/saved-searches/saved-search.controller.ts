/**
 * Customer saved-searches endpoints — mounted in app.ts at /v1/public.
 *
 *   GET    /v1/public/me/saved-searches?page=1&pageSize=20   — paginated list
 *   GET    /v1/public/me/saved-searches/:id                  — single record
 *   POST   /v1/public/me/saved-searches                      — create (201)
 *   PATCH  /v1/public/me/saved-searches/:id                  — partial update
 *   DELETE /v1/public/me/saved-searches/:id                  — delete (204)
 *
 * All routes require a valid customer session (Bearer JWT).
 * Error envelope: { code, error } — locked per existing API convention.
 *
 * Status codes:
 *   AUTH_REQUIRED           → 401
 *   TOKEN_INVALID           → 401
 *   TOKEN_EXPIRED           → 410
 *   SAVED_SEARCH_NOT_FOUND  → 404
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireCustomerSession } from '../auth/require-customer-session';
import { CreateSavedSearchInputSchema, UpdateSavedSearchInputSchema } from '@behbehani-cpo/shared-types';
import {
  SavedSearchError,
  createSavedSearch,
  deleteSavedSearch,
  getSavedSearch,
  listSavedSearches,
  mapSavedSearchErrorToHttp,
  updateSavedSearch,
} from './saved-search.service';

export const savedSearchPublicRouter = Router();

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

// ─── GET /v1/public/me/saved-searches ────────────────────────────────────────

savedSearchPublicRouter.get(
  '/me/saved-searches',
  requireCustomerSession,
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const { page, pageSize } = PaginationQuerySchema.parse(req.query);
      const result = await listSavedSearches(req.customer!.id, { page, pageSize });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /v1/public/me/saved-searches/:id ────────────────────────────────────

savedSearchPublicRouter.get(
  '/me/saved-searches/:id',
  requireCustomerSession,
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const result = await getSavedSearch(req.params.id, req.customer!.id);
      res.json(result);
    } catch (err) {
      if (err instanceof SavedSearchError) {
        const { status, body } = mapSavedSearchErrorToHttp(err);
        res.status(status).json(body);
        return;
      }
      next(err);
    }
  },
);

// ─── POST /v1/public/me/saved-searches ───────────────────────────────────────

savedSearchPublicRouter.post(
  '/me/saved-searches',
  requireCustomerSession,
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      const input = CreateSavedSearchInputSchema.parse(req.body);
      const result = await createSavedSearch(req.customer!.id, input);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof SavedSearchError) {
        const { status, body } = mapSavedSearchErrorToHttp(err);
        res.status(status).json(body);
        return;
      }
      next(err);
    }
  },
);

// ─── PATCH /v1/public/me/saved-searches/:id ──────────────────────────────────

savedSearchPublicRouter.patch(
  '/me/saved-searches/:id',
  requireCustomerSession,
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      const input = UpdateSavedSearchInputSchema.parse(req.body);
      const result = await updateSavedSearch(req.params.id, req.customer!.id, input);
      res.json(result);
    } catch (err) {
      if (err instanceof SavedSearchError) {
        const { status, body } = mapSavedSearchErrorToHttp(err);
        res.status(status).json(body);
        return;
      }
      next(err);
    }
  },
);

// ─── DELETE /v1/public/me/saved-searches/:id ─────────────────────────────────

savedSearchPublicRouter.delete(
  '/me/saved-searches/:id',
  requireCustomerSession,
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      await deleteSavedSearch(req.params.id, req.customer!.id);
      res.status(204).send();
    } catch (err) {
      if (err instanceof SavedSearchError) {
        const { status, body } = mapSavedSearchErrorToHttp(err);
        res.status(status).json(body);
        return;
      }
      next(err);
    }
  },
);
