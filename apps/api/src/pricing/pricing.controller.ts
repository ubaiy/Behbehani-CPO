import { Router } from 'express';
import {
  PricingTierCreateSchema,
  PricingTierUpdateSchema,
  PricingPreviewRequestSchema,
} from '@behbehani-cpo/shared-types';
import { requireAdminRole, requireAuth } from '../middleware/auth';
import { PRICING_READ_ROLES as READ_ROLES, PRICING_WRITE_ROLES as WRITE_ROLES } from '../auth/role-groups';
import { auditMutation, recordAudit } from '../middleware/audit';
import { validateBody } from '../middleware/validate';
import {
  createPricingTier,
  deletePricingTier,
  getPricingTier,
  listPricingTiers,
  previewPricingImpact,
  updatePricingTier,
} from './pricing.service';
import { PricingError } from './pricing.errors';
import type { PricingTierCreate, PricingTierUpdate, PricingPreviewRequest } from '@behbehani-cpo/shared-types';

export const pricingRouter = Router();

pricingRouter.use(requireAuth);
pricingRouter.use(auditMutation('admin.pricing'));

// GET /v1/admin/pricing-tiers/
pricingRouter.get('/', requireAdminRole(...READ_ROLES), async (req, res, next) => {
  try {
    const result = await listPricingTiers();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /v1/admin/pricing-tiers/preview — declare before /:id to avoid route collision
pricingRouter.post(
  '/preview',
  requireAdminRole(...READ_ROLES),
  validateBody(PricingPreviewRequestSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as PricingPreviewRequest;
      const result = await previewPricingImpact(dto);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /v1/admin/pricing-tiers/:id
pricingRouter.get('/:id', requireAdminRole(...READ_ROLES), async (req, res, next) => {
  try {
    const detail = await getPricingTier(req.params.id);
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

// POST /v1/admin/pricing-tiers/
pricingRouter.post(
  '/',
  requireAdminRole(...WRITE_ROLES),
  validateBody(PricingTierCreateSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as PricingTierCreate;
      const tier = await createPricingTier(dto, req.user!.sub);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'pricing.tier.create',
        resource: 'admin.pricing',
        resourceId: tier.id,
        after: { name: tier.name, daysThresholdMin: tier.daysThresholdMin, discountBps: tier.discountBps },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(201).json(tier);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /v1/admin/pricing-tiers/:id
pricingRouter.patch(
  '/:id',
  requireAdminRole(...WRITE_ROLES),
  validateBody(PricingTierUpdateSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as PricingTierUpdate;
      const { before, after } = await updatePricingTier(req.params.id, dto, req.user!.sub);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'pricing.tier.update',
        resource: 'admin.pricing',
        resourceId: after.id,
        before: { name: before.name, daysThresholdMin: before.daysThresholdMin, discountBps: before.discountBps },
        after: { name: after.name, daysThresholdMin: after.daysThresholdMin, discountBps: after.discountBps },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(after);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /v1/admin/pricing-tiers/:id
pricingRouter.delete('/:id', requireAdminRole(...WRITE_ROLES), async (req, res, next) => {
  try {
    const snapshot = await deletePricingTier(req.params.id, req.user!.sub);
    await recordAudit({
      actorId: req.user!.sub,
      action: 'pricing.tier.delete',
      resource: 'admin.pricing',
      resourceId: snapshot.id,
      before: { name: snapshot.name, daysThresholdMin: snapshot.daysThresholdMin, discountBps: snapshot.discountBps },
      ip: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Local error handler — converts PricingError to structured HTTP response
pricingRouter.use(
  (
    err: unknown,
    _req: import('express').Request,
    res: import('express').Response,
    next: import('express').NextFunction,
  ) => {
    if (err instanceof PricingError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  },
);
