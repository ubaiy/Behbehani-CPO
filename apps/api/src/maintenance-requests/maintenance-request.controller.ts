/**
 * Customer maintenance pickup request endpoints — mounted in app.ts at /v1/public.
 *
 *   GET    /v1/public/me/maintenance-requests?page=1&pageSize=20&status=open|closed
 *   GET    /v1/public/me/maintenance-requests/:id
 *   POST   /v1/public/me/maintenance-requests                (Idempotency-Key header)
 *   PATCH  /v1/public/me/maintenance-requests/:id
 *   DELETE /v1/public/me/maintenance-requests/:id
 *
 * All routes require a valid customer session (Bearer JWT).
 * Error envelope: { code, error } — locked per existing API convention.
 *
 * Status codes:
 *   AUTH_REQUIRED                      → 401
 *   TOKEN_INVALID                      → 401
 *   TOKEN_EXPIRED                      → 410
 *   MAINTENANCE_REQUEST_NOT_FOUND      → 404
 *   MAINTENANCE_REQUEST_NOT_CANCELLABLE → 409
 *   MAINTENANCE_REQUEST_NOT_EDITABLE   → 409
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireCustomerSession } from '../auth/require-customer-session';
import {
  CreateMaintenanceRequestInputSchema,
  UpdateMaintenanceRequestInputSchema,
} from '@behbehani-cpo/shared-types';
import {
  MaintenanceRequestError,
  createMaintenanceRequest,
  deleteMaintenanceRequest,
  getMaintenanceRequest,
  listMaintenanceRequests,
  mapMaintenanceRequestErrorToHttp,
  updateMaintenanceRequest,
} from './maintenance-request.service';

export const maintenanceRequestPublicRouter = Router();

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

const ListQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status:   z.enum(['open', 'closed']).optional(),
});

// ─── GET /v1/public/me/maintenance-requests ───────────────────────────────────

maintenanceRequestPublicRouter.get(
  '/me/maintenance-requests',
  requireCustomerSession,
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const { page, pageSize, status } = ListQuerySchema.parse(req.query);
      const result = await listMaintenanceRequests(req.customer!.id, {
        page,
        pageSize,
        status,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /v1/public/me/maintenance-requests/:id ───────────────────────────────

maintenanceRequestPublicRouter.get(
  '/me/maintenance-requests/:id',
  requireCustomerSession,
  publicReadLimiter,
  async (req, res, next) => {
    try {
      const result = await getMaintenanceRequest(req.params.id, req.customer!.id);
      res.json(result);
    } catch (err) {
      if (err instanceof MaintenanceRequestError) {
        const { status, body } = mapMaintenanceRequestErrorToHttp(err);
        res.status(status).json(body);
        return;
      }
      next(err);
    }
  },
);

// ─── POST /v1/public/me/maintenance-requests ──────────────────────────────────

maintenanceRequestPublicRouter.post(
  '/me/maintenance-requests',
  requireCustomerSession,
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      const input = CreateMaintenanceRequestInputSchema.parse(req.body);
      const idempotencyKey = (req.headers['idempotency-key'] as string | undefined) ?? null;
      const result = await createMaintenanceRequest(
        req.customer!.id,
        input,
        idempotencyKey,
      );
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof MaintenanceRequestError) {
        const { status, body } = mapMaintenanceRequestErrorToHttp(err);
        res.status(status).json(body);
        return;
      }
      next(err);
    }
  },
);

// ─── PATCH /v1/public/me/maintenance-requests/:id ────────────────────────────

maintenanceRequestPublicRouter.patch(
  '/me/maintenance-requests/:id',
  requireCustomerSession,
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      const input = UpdateMaintenanceRequestInputSchema.parse(req.body);
      const result = await updateMaintenanceRequest(
        req.params.id,
        req.customer!.id,
        input,
      );
      res.json(result);
    } catch (err) {
      if (err instanceof MaintenanceRequestError) {
        const { status, body } = mapMaintenanceRequestErrorToHttp(err);
        res.status(status).json(body);
        return;
      }
      next(err);
    }
  },
);

// ─── DELETE /v1/public/me/maintenance-requests/:id ───────────────────────────

maintenanceRequestPublicRouter.delete(
  '/me/maintenance-requests/:id',
  requireCustomerSession,
  publicMutationLimiter,
  async (req, res, next) => {
    try {
      await deleteMaintenanceRequest(req.params.id, req.customer!.id);
      res.status(204).send();
    } catch (err) {
      if (err instanceof MaintenanceRequestError) {
        const { status, body } = mapMaintenanceRequestErrorToHttp(err);
        res.status(status).json(body);
        return;
      }
      next(err);
    }
  },
);
