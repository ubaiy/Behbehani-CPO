import { Router } from 'express';
import {
  AgingRunNowRequestSchema,
  AgingPauseRequestSchema,
} from '@behbehani-cpo/shared-types';
import { requireAuth, requireAdminRole } from '../middleware/auth';
import { AGING_READ_ROLES as READ_ROLES, AGING_WRITE_ROLES as WRITE_ROLES } from '../auth/role-groups';
import { auditMutation, recordAudit } from '../middleware/audit';
import { validateBody } from '../middleware/validate';
import { AgingError } from './aging.errors';
import {
  getEngineStatus,
  getRuns,
  getActiveDiscounts,
  getAgingDistribution,
  triggerRunNow,
  setPaused,
} from './aging.service';

export const agingRouter = Router();

agingRouter.use(requireAuth);
agingRouter.use(auditMutation('admin.aging'));

// GET /status
agingRouter.get(
  '/status',
  requireAdminRole(...READ_ROLES),
  async (_req, res, next) => {
    try {
      const dto = await getEngineStatus();
      res.json(dto);
    } catch (err) {
      next(err);
    }
  },
);

// GET /runs?limit=20&page=1
agingRouter.get(
  '/runs',
  requireAdminRole(...READ_ROLES),
  async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const result = await getRuns(page, limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /active-discounts
agingRouter.get(
  '/active-discounts',
  requireAdminRole(...READ_ROLES),
  async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));
      const filter = {
        page,
        pageSize,
        stage: req.query.stage as string | undefined,
        tierId: req.query.tierId as string | undefined,
        brandId: req.query.brandId as string | undefined,
        daysMin: req.query.daysMin !== undefined ? Number(req.query.daysMin) : undefined,
        daysMax: req.query.daysMax !== undefined ? Number(req.query.daysMax) : undefined,
        q: req.query.q as string | undefined,
      };
      const result = await getActiveDiscounts(filter);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /distribution
agingRouter.get(
  '/distribution',
  requireAdminRole(...READ_ROLES),
  async (_req, res, next) => {
    try {
      const dto = await getAgingDistribution();
      res.json(dto);
    } catch (err) {
      next(err);
    }
  },
);

// POST /run-now
agingRouter.post(
  '/run-now',
  requireAdminRole(...WRITE_ROLES),
  validateBody(AgingRunNowRequestSchema),
  async (req, res, next) => {
    try {
      const { dryRun = false } = req.body as { dryRun?: boolean };
      const dto = await triggerRunNow(req.user!.sub, dryRun);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'aging.run-now',
        resource: 'admin.aging',
        resourceId: dto.id,
        after: { dryRun, status: dto.status },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(202).json(dto);
    } catch (err) {
      next(err);
    }
  },
);

// POST /pause
agingRouter.post(
  '/pause',
  requireAdminRole(...WRITE_ROLES),
  validateBody(AgingPauseRequestSchema),
  async (req, res, next) => {
    try {
      const { paused } = req.body as { paused: boolean };
      const result = await setPaused(paused);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'aging.pause',
        resource: 'admin.aging',
        after: { paused: result },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json({ paused: result });
    } catch (err) {
      next(err);
    }
  },
);

// Local error handler for AgingError
agingRouter.use(
  (
    err: unknown,
    _req: import('express').Request,
    res: import('express').Response,
    next: import('express').NextFunction,
  ) => {
    if (err instanceof AgingError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  },
);
