import { Router } from 'express';
import {
  ChangeStageSchema,
  CreateListingSchema,
  ListingFilterSchema,
  SetFeaturedSchema,
  UpdateListingSchema,
} from '@behbehani-cpo/shared-types';
import { requireAdminRole, requireAuth } from '../middleware/auth';
import { LISTINGS_READ_ROLES as READ_ROLES, LISTINGS_WRITE_ROLES as WRITE_ROLES } from '../auth/role-groups';
import { auditMutation, recordAudit } from '../middleware/audit';
import { validateBody } from '../middleware/validate';
import {
  ListingError,
  archive,
  changeStage,
  create,
  getForAdmin,
  listForAdmin,
  setFeatured,
  update,
} from './listings.service';

export const adminListingsRouter = Router();

adminListingsRouter.use(requireAuth);
adminListingsRouter.use(auditMutation('admin.listing'));

adminListingsRouter.get('/', requireAdminRole(...READ_ROLES), async (req, res, next) => {
  try {
    const filter = ListingFilterSchema.parse(req.query);
    const result = await listForAdmin(filter);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

adminListingsRouter.get('/:id', requireAdminRole(...READ_ROLES), async (req, res, next) => {
  try {
    const detail = await getForAdmin(req.params.id);
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

adminListingsRouter.post(
  '/',
  requireAdminRole(...WRITE_ROLES),
  validateBody(CreateListingSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as ReturnType<typeof CreateListingSchema.parse>;
      const detail = await create(dto, req.user!.sub);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'listing.create',
        resource: 'admin.listing',
        resourceId: detail.id,
        after: { stockNumber: detail.stockNumber, vin: detail.vinMasked, stage: detail.stage },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(201).json(detail);
    } catch (err) {
      next(err);
    }
  },
);

adminListingsRouter.patch(
  '/:id',
  requireAdminRole(...WRITE_ROLES),
  validateBody(UpdateListingSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as ReturnType<typeof UpdateListingSchema.parse>;
      const detail = await update(req.params.id, dto, req.user!.sub);
      res.json(detail);
    } catch (err) {
      next(err);
    }
  },
);

adminListingsRouter.post(
  '/:id/stage',
  requireAdminRole(...WRITE_ROLES),
  validateBody(ChangeStageSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as ReturnType<typeof ChangeStageSchema.parse>;
      const detail = await changeStage(req.params.id, dto, req.user!.sub);
      res.json(detail);
    } catch (err) {
      next(err);
    }
  },
);

adminListingsRouter.delete('/:id', requireAdminRole(...WRITE_ROLES), async (req, res, next) => {
  try {
    await archive(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminListingsRouter.post(
  '/:id/featured',
  requireAdminRole(...WRITE_ROLES),
  validateBody(SetFeaturedSchema),
  async (req, res, next) => {
    try {
      const dto = req.body as ReturnType<typeof SetFeaturedSchema.parse>;
      const { before, after, changed } = await setFeatured(req.params.id, dto.featured);
      if (changed) {
        await recordAudit({
          actorId: req.user!.sub,
          action: dto.featured ? 'listing.feature' : 'listing.unfeature',
          resource: 'admin.listing',
          resourceId: after.id,
          before: { featuredAt: before.featuredAt },
          after: { featuredAt: after.featuredAt },
          ip: req.ip ?? null,
          userAgent: req.get('user-agent') ?? null,
        });
      }
      res.json(after);
    } catch (err) {
      next(err);
    }
  },
);

adminListingsRouter.use(
  (err: unknown, _req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    if (err instanceof ListingError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  },
);
