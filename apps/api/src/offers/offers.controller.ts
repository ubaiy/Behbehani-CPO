/**
 * Admin offers router — Phase 4.
 *
 * Mounted at:
 *   /v1/admin/offers          — the main offers resource
 *
 * The offer-creation route `POST /v1/admin/inspections/:id/offer` is mounted
 * HERE (not in inspections.controller.ts) because:
 *   1. The handler delegates purely to offersService.createOffer — no
 *      inspection-module internals are touched.
 *   2. Keeping it here avoids a circular dependency between the inspections
 *      and offers modules.
 * The controller is exported as `adminOffersRouter` and app.ts mounts it at
 * BOTH /v1/admin/offers AND /v1/admin/inspections so both path groups resolve.
 *
 * Role gating follows inspections.controller.ts conventions.
 */

import { Router } from 'express';
import {
  AdminCounterSchema,
  CreateOfferSchema,
  OfferListFilterSchema,
} from '@behbehani-cpo/shared-types';
import { requireAuth, requireAdminRole } from '../middleware/auth';
import { auditMutation } from '../middleware/audit';
import { validateBody } from '../middleware/validate';
import { OfferError } from './offers.errors';
import {
  createOffer,
  listOffersForAdmin,
  getOfferForAdmin,
  sendOffer,
  submitAdminCounter,
  respondToCounter,
  withdrawOffer,
  getKpiForAdmin,
} from './offers.service';

export const adminOffersRouter = Router();

const SALES_ROLES = ['sales_agent', 'operations_manager', 'general_manager'] as const;
const READ_ROLES = [
  'sales_agent',
  'operations_manager',
  'general_manager',
  'finance_officer',
] as const;
const RESPOND_ROLES = ['sales_agent', 'operations_manager'] as const;

adminOffersRouter.use(requireAuth);
adminOffersRouter.use(auditMutation('admin.offer'));

// ─── Nested creation route — POST /v1/admin/inspections/:id/offer ─────────────
//
// app.ts dual-mounts adminOffersRouter at BOTH `/v1/admin/offers` AND
// `/v1/admin/inspections`. The path below is relative to whichever mount the
// request came in on. Under `/v1/admin/inspections` it resolves to
// `/v1/admin/inspections/:id/offer` — the URL the admin frontend POSTs to.
// (Under `/v1/admin/offers` it would resolve to `/v1/admin/offers/:id/offer`,
// which is also valid but unused — the admin UI only hits the inspections-
// prefixed URL.) The `:id` here is the inspectionId in both cases.

adminOffersRouter.post(
  '/:id/offer',
  requireAdminRole(...SALES_ROLES),
  validateBody(CreateOfferSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as ReturnType<typeof CreateOfferSchema.parse>;
      const result = await createOffer(req.params.id, dto, req.user!.sub, {
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /v1/admin/offers/kpi — KPI counts for the admin dashboard strip ──────
// F1: endpoint was missing; frontend OffersService.getKpi() calls this route.
// Backed by repo.groupOfferCountByStatus() (already shipped in Wave 1).
// Must be registered before '/:id' so the literal 'kpi' is not swallowed as an
// id param.

adminOffersRouter.get(
  '/kpi',
  requireAdminRole(...READ_ROLES),
  async (_req, res, next) => {
    try {
      const kpi = await getKpiForAdmin();
      res.json(kpi);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /v1/admin/offers — paginated list with filters ───────────────────────

adminOffersRouter.get(
  '/',
  requireAdminRole(...READ_ROLES),
  async (req, res, next) => {
    try {
      const filter = OfferListFilterSchema.parse(req.query);
      const result = await listOffersForAdmin(filter);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /v1/admin/offers/:id — full offer detail with history ────────────────

adminOffersRouter.get(
  '/:id',
  requireAdminRole(...READ_ROLES),
  async (req, res, next) => {
    try {
      const result = await getOfferForAdmin(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /v1/admin/offers/:id/send — publish drafted offer ──────────────────

adminOffersRouter.post(
  '/:id/send',
  requireAdminRole(...RESPOND_ROLES),
  async (req, res, next) => {
    try {
      const result = await sendOffer(req.params.id, req.user!.sub, {
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /v1/admin/offers/:id/counter — admin issues a counter-offer ────────
// §16 D1: admin counter; transitions to countered_by_admin.

adminOffersRouter.patch(
  '/:id/counter',
  requireAdminRole(...RESPOND_ROLES),
  validateBody(AdminCounterSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as ReturnType<typeof AdminCounterSchema.parse>;
      const result = await submitAdminCounter(req.params.id, dto, req.user!.sub, {
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /v1/admin/offers/:id/respond-counter — accept/decline customer counter

adminOffersRouter.post(
  '/:id/respond-counter',
  requireAdminRole(...RESPOND_ROLES),
  async (req, res, next) => {
    try {
      const body = req.body as { action?: unknown };
      if (body.action !== 'accept' && body.action !== 'decline') {
        res.status(400).json({ error: 'action must be accept or decline', code: 'BAD_REQUEST' });
        return;
      }
      const result = await respondToCounter(
        req.params.id,
        body.action as 'accept' | 'decline',
        req.user!.sub,
        { ip: req.ip ?? null, userAgent: req.get('user-agent') ?? null },
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /v1/admin/offers/:id/withdraw — retract offer ──────────────────────

adminOffersRouter.post(
  '/:id/withdraw',
  requireAdminRole(...RESPOND_ROLES),
  async (req, res, next) => {
    try {
      await withdrawOffer(req.params.id, req.user!.sub, {
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Local error adapter ──────────────────────────────────────────────────────

adminOffersRouter.use(
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
