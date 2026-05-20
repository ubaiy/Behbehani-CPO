import { Router } from 'express';
import { z } from 'zod';
import {
  BrandCreateSchema,
  BrandUpdateSchema,
  BrandLogoPresignRequestSchema,
  ModelCreateSchema,
  ModelUpdateSchema,
  TrimCreateSchema,
  TrimUpdateSchema,
  BodyTypeCreateSchema,
  BodyTypeUpdateSchema,
  CatalogListQuerySchema,
} from '@behbehani-cpo/shared-types';
import { requireAuth, requireAdminRole } from '../middleware/auth';
import { CATALOG_READ_ROLES, CATALOG_WRITE_ROLES } from '../auth/role-groups';
import { auditMutation, recordAudit } from '../middleware/audit';
import { validateBody } from '../middleware/validate';
import { CatalogError } from './catalog-admin.errors';
import {
  listBrandsService,
  getBrand,
  createBrandService,
  updateBrandService,
  setBrandActiveService,
  presignBrandLogoService,
  removeBrandLogoService,
  listModelsByBrandService,
  createModelService,
  updateModelService,
  setModelActiveService,
  createTrimService,
  updateTrimService,
  setTrimActiveService,
  listBodyTypesService,
  createBodyTypeService,
  updateBodyTypeService,
  setBodyTypeActiveService,
} from './catalog-admin.service';

export const catalogAdminRouter = Router();

// Shared list-query schema for all three list endpoints — defined in
// shared-types so the data-access client and tests can reuse the same shape.
const ListQuerySchema = CatalogListQuerySchema;

const SetActiveSchema = z.object({ isActive: z.boolean() });

catalogAdminRouter.use(requireAuth);
catalogAdminRouter.use(auditMutation('admin.catalog'));

// ─── Brand routes ────────────────────────────────────────────────────────────

catalogAdminRouter.get('/brands', requireAdminRole(...CATALOG_READ_ROLES), async (req, res, next) => {
  try {
    const filter = ListQuerySchema.parse(req.query);
    const result = await listBrandsService(filter);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

catalogAdminRouter.get('/brands/:id', requireAdminRole(...CATALOG_READ_ROLES), async (req, res, next) => {
  try {
    const dto = await getBrand(req.params.id);
    res.json(dto);
  } catch (err) {
    next(err);
  }
});

catalogAdminRouter.post(
  '/brands',
  requireAdminRole(...CATALOG_WRITE_ROLES),
  validateBody(BrandCreateSchema),
  async (req, res, next) => {
    try {
      const { after } = await createBrandService(req.body);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'catalog.brand.create',
        resource: 'admin.catalog',
        resourceId: after.id,
        after: { slug: after.slug, nameEn: after.nameEn, nameAr: after.nameAr, isActive: after.isActive },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(201).json(after);
    } catch (err) {
      next(err);
    }
  },
);

catalogAdminRouter.patch(
  '/brands/:id',
  requireAdminRole(...CATALOG_WRITE_ROLES),
  validateBody(BrandUpdateSchema),
  async (req, res, next) => {
    try {
      const { before, after } = await updateBrandService(req.params.id, req.body);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'catalog.brand.update',
        resource: 'admin.catalog',
        resourceId: after.id,
        before: { slug: before.slug, nameEn: before.nameEn, nameAr: before.nameAr, isActive: before.isActive, logoUrl: before.logoUrl },
        after: { slug: after.slug, nameEn: after.nameEn, nameAr: after.nameAr, isActive: after.isActive, logoUrl: after.logoUrl },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(after);
    } catch (err) {
      next(err);
    }
  },
);

catalogAdminRouter.post(
  '/brands/:id/active',
  requireAdminRole(...CATALOG_WRITE_ROLES),
  validateBody(SetActiveSchema),
  async (req, res, next) => {
    try {
      const { before, after, referencingListings } = await setBrandActiveService(req.params.id, req.body.isActive);
      if (before.isActive !== after.isActive) {
        await recordAudit({
          actorId: req.user!.sub,
          action: after.isActive ? 'catalog.brand.activate' : 'catalog.brand.deactivate',
          resource: 'admin.catalog',
          resourceId: after.id,
          before: { isActive: before.isActive },
          after: { isActive: after.isActive, referencingListings },
          ip: req.ip ?? null,
          userAgent: req.get('user-agent') ?? null,
        });
      }
      res.json({ ...after, referencingListings });
    } catch (err) {
      next(err);
    }
  },
);

catalogAdminRouter.post(
  '/brands/:id/logo/presign',
  requireAdminRole(...CATALOG_WRITE_ROLES),
  validateBody(BrandLogoPresignRequestSchema),
  async (req, res, next) => {
    try {
      const result = await presignBrandLogoService(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

catalogAdminRouter.delete(
  '/brands/:id/logo',
  requireAdminRole(...CATALOG_WRITE_ROLES),
  async (req, res, next) => {
    try {
      const { before, after } = await removeBrandLogoService(req.params.id);
      if (before.logoUrl !== after.logoUrl) {
        await recordAudit({
          actorId: req.user!.sub,
          action: 'catalog.brand.logo.remove',
          resource: 'admin.catalog',
          resourceId: after.id,
          before: { logoUrl: before.logoUrl },
          after: { logoUrl: null },
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

// ─── Model routes ────────────────────────────────────────────────────────────

catalogAdminRouter.get(
  '/brands/:brandId/models',
  requireAdminRole(...CATALOG_READ_ROLES),
  async (req, res, next) => {
    try {
      const filter = ListQuerySchema.parse(req.query);
      const result = await listModelsByBrandService(req.params.brandId, filter);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

catalogAdminRouter.post(
  '/models',
  requireAdminRole(...CATALOG_WRITE_ROLES),
  validateBody(ModelCreateSchema),
  async (req, res, next) => {
    try {
      const { after } = await createModelService(req.body);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'catalog.model.create',
        resource: 'admin.catalog',
        resourceId: after.id,
        after: { brandId: after.brandId, slug: after.slug, nameEn: after.nameEn, isActive: after.isActive },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(201).json(after);
    } catch (err) {
      next(err);
    }
  },
);

catalogAdminRouter.patch(
  '/models/:id',
  requireAdminRole(...CATALOG_WRITE_ROLES),
  validateBody(ModelUpdateSchema),
  async (req, res, next) => {
    try {
      const { before, after } = await updateModelService(req.params.id, req.body);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'catalog.model.update',
        resource: 'admin.catalog',
        resourceId: after.id,
        before: { slug: before.slug, nameEn: before.nameEn, nameAr: before.nameAr, isActive: before.isActive },
        after: { slug: after.slug, nameEn: after.nameEn, nameAr: after.nameAr, isActive: after.isActive },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(after);
    } catch (err) {
      next(err);
    }
  },
);

catalogAdminRouter.post(
  '/models/:id/active',
  requireAdminRole(...CATALOG_WRITE_ROLES),
  validateBody(SetActiveSchema),
  async (req, res, next) => {
    try {
      const { before, after, referencingListings } = await setModelActiveService(req.params.id, req.body.isActive);
      if (before.isActive !== after.isActive) {
        await recordAudit({
          actorId: req.user!.sub,
          action: after.isActive ? 'catalog.model.activate' : 'catalog.model.deactivate',
          resource: 'admin.catalog',
          resourceId: after.id,
          before: { isActive: before.isActive },
          after: { isActive: after.isActive, referencingListings },
          ip: req.ip ?? null,
          userAgent: req.get('user-agent') ?? null,
        });
      }
      res.json({ ...after, referencingListings });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Trim routes ─────────────────────────────────────────────────────────────

catalogAdminRouter.post(
  '/trims',
  requireAdminRole(...CATALOG_WRITE_ROLES),
  validateBody(TrimCreateSchema),
  async (req, res, next) => {
    try {
      const dto = await createTrimService(req.body);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'catalog.trim.create',
        resource: 'admin.catalog',
        resourceId: dto.id,
        after: { modelId: dto.modelId, name: dto.name, isActive: dto.isActive },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(201).json(dto);
    } catch (err) {
      next(err);
    }
  },
);

catalogAdminRouter.patch(
  '/trims/:id',
  requireAdminRole(...CATALOG_WRITE_ROLES),
  validateBody(TrimUpdateSchema),
  async (req, res, next) => {
    try {
      const dto = await updateTrimService(req.params.id, req.body);
      res.json(dto);
    } catch (err) {
      next(err);
    }
  },
);

catalogAdminRouter.post(
  '/trims/:id/active',
  requireAdminRole(...CATALOG_WRITE_ROLES),
  validateBody(SetActiveSchema),
  async (req, res, next) => {
    try {
      const dto = await setTrimActiveService(req.params.id, req.body.isActive);
      res.json(dto);
    } catch (err) {
      next(err);
    }
  },
);

// ─── BodyType routes ─────────────────────────────────────────────────────────

catalogAdminRouter.get(
  '/body-types',
  requireAdminRole(...CATALOG_READ_ROLES),
  async (req, res, next) => {
    try {
      const filter = ListQuerySchema.parse(req.query);
      const result = await listBodyTypesService(filter);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

catalogAdminRouter.post(
  '/body-types',
  requireAdminRole(...CATALOG_WRITE_ROLES),
  validateBody(BodyTypeCreateSchema),
  async (req, res, next) => {
    try {
      const { after } = await createBodyTypeService(req.body);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'catalog.body-type.create',
        resource: 'admin.catalog',
        resourceId: after.id,
        after: { slug: after.slug, nameEn: after.nameEn, nameAr: after.nameAr, isActive: after.isActive },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(201).json(after);
    } catch (err) {
      next(err);
    }
  },
);

catalogAdminRouter.patch(
  '/body-types/:id',
  requireAdminRole(...CATALOG_WRITE_ROLES),
  validateBody(BodyTypeUpdateSchema),
  async (req, res, next) => {
    try {
      const { before, after } = await updateBodyTypeService(req.params.id, req.body);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'catalog.body-type.update',
        resource: 'admin.catalog',
        resourceId: after.id,
        before: { slug: before.slug, nameEn: before.nameEn, nameAr: before.nameAr, isActive: before.isActive },
        after: { slug: after.slug, nameEn: after.nameEn, nameAr: after.nameAr, isActive: after.isActive },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(after);
    } catch (err) {
      next(err);
    }
  },
);

catalogAdminRouter.post(
  '/body-types/:id/active',
  requireAdminRole(...CATALOG_WRITE_ROLES),
  validateBody(SetActiveSchema),
  async (req, res, next) => {
    try {
      const { before, after, referencingListings } = await setBodyTypeActiveService(req.params.id, req.body.isActive);
      if (before.isActive !== after.isActive) {
        await recordAudit({
          actorId: req.user!.sub,
          action: after.isActive ? 'catalog.body-type.activate' : 'catalog.body-type.deactivate',
          resource: 'admin.catalog',
          resourceId: after.id,
          before: { isActive: before.isActive },
          after: { isActive: after.isActive, referencingListings },
          ip: req.ip ?? null,
          userAgent: req.get('user-agent') ?? null,
        });
      }
      res.json({ ...after, referencingListings });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Local error adapter ─────────────────────────────────────────────────────

catalogAdminRouter.use(
  (err: unknown, _req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    if (err instanceof CatalogError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  },
);
