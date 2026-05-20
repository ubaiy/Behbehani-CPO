import { z } from 'zod';

/**
 * Catalog DTOs (Brand / Model / Trim / BodyType) shared between API and admin.
 * Plan reference: Sprint 2.6 — Brands & Models admin module.
 *
 * Slug rules:
 *  - lowercase ASCII letters + digits + dashes (see shared-utils `isValidSlug`)
 *  - Brand.slug unique globally
 *  - Model.slug unique per (brandId, slug)
 *  - Trim.name unique per (modelId, name) — trims have no slug
 *  - BodyType.slug unique globally
 *
 * Soft delete: every entity has `isActive`. Toggling to false hides from
 * customer browse + create-listing dropdowns, but referencing listings keep
 * working. No hard-delete endpoint.
 */

// Slug regex matches what shared-utils.slugify produces — keep in lockstep.
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ─── Brand ───────────────────────────────────────────────────────────────────

export const BrandDtoSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(SLUG_REGEX),
  nameEn: z.string().min(1).max(80),
  nameAr: z.string().min(1).max(80),
  logoUrl: z.string().url().nullable(),
  isActive: z.boolean(),
  modelCount: z.number().int().min(0),
  listingCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type BrandDto = z.infer<typeof BrandDtoSchema>;

export const BrandCreateSchema = z.object({
  slug: z.string().regex(SLUG_REGEX).max(80),
  nameEn: z.string().min(1).max(80),
  nameAr: z.string().min(1).max(80),
  logoUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});
export type BrandCreate = z.infer<typeof BrandCreateSchema>;

export const BrandUpdateSchema = z
  .object({
    slug: z.string().regex(SLUG_REGEX).max(80).optional(),
    nameEn: z.string().min(1).max(80).optional(),
    nameAr: z.string().min(1).max(80).optional(),
    logoUrl: z.string().url().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field must be provided',
  });
export type BrandUpdate = z.infer<typeof BrandUpdateSchema>;

export const BrandListResponseSchema = z.object({
  items: z.array(BrandDtoSchema),
  total: z.number().int(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type BrandListResponse = z.infer<typeof BrandListResponseSchema>;

export const BrandLogoPresignRequestSchema = z.object({
  contentType: z.enum(['image/png', 'image/svg+xml']),
  byteSize: z.number().int().min(1),
});
export type BrandLogoPresignRequest = z.infer<typeof BrandLogoPresignRequestSchema>;

export const BrandLogoPresignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  s3Key: z.string(),
  publicUrl: z.string().url(),
  expiresAt: z.string().datetime(),
});
export type BrandLogoPresignResponse = z.infer<typeof BrandLogoPresignResponseSchema>;

// ─── Model ───────────────────────────────────────────────────────────────────

export const TrimDtoSchema = z.object({
  id: z.string().uuid(),
  modelId: z.string().uuid(),
  name: z.string().min(1).max(40),
  isActive: z.boolean(),
  listingCount: z.number().int().min(0),
});
export type TrimDto = z.infer<typeof TrimDtoSchema>;

export const ModelDtoSchema = z.object({
  id: z.string().uuid(),
  brandId: z.string().uuid(),
  slug: z.string().regex(SLUG_REGEX),
  nameEn: z.string().min(1).max(80),
  nameAr: z.string().min(1).max(80),
  isActive: z.boolean(),
  trims: z.array(TrimDtoSchema),
  listingCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ModelDto = z.infer<typeof ModelDtoSchema>;

export const ModelCreateSchema = z.object({
  brandId: z.string().uuid(),
  slug: z.string().regex(SLUG_REGEX).max(80),
  nameEn: z.string().min(1).max(80),
  nameAr: z.string().min(1).max(80),
  isActive: z.boolean().optional().default(true),
});
export type ModelCreate = z.infer<typeof ModelCreateSchema>;

export const ModelUpdateSchema = z
  .object({
    slug: z.string().regex(SLUG_REGEX).max(80).optional(),
    nameEn: z.string().min(1).max(80).optional(),
    nameAr: z.string().min(1).max(80).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field must be provided',
  });
export type ModelUpdate = z.infer<typeof ModelUpdateSchema>;

export const ModelListResponseSchema = z.object({
  items: z.array(ModelDtoSchema),
  total: z.number().int(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type ModelListResponse = z.infer<typeof ModelListResponseSchema>;

// ─── Trim ────────────────────────────────────────────────────────────────────

export const TrimCreateSchema = z.object({
  modelId: z.string().uuid(),
  name: z.string().min(1).max(40),
  isActive: z.boolean().optional().default(true),
});
export type TrimCreate = z.infer<typeof TrimCreateSchema>;

export const TrimUpdateSchema = z
  .object({
    name: z.string().min(1).max(40).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field must be provided',
  });
export type TrimUpdate = z.infer<typeof TrimUpdateSchema>;

// ─── Body type ───────────────────────────────────────────────────────────────

export const BodyTypeDtoSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(SLUG_REGEX),
  nameEn: z.string().min(1).max(80),
  nameAr: z.string().min(1).max(80),
  isActive: z.boolean(),
  listingCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type BodyTypeDto = z.infer<typeof BodyTypeDtoSchema>;

export const BodyTypeCreateSchema = z.object({
  slug: z.string().regex(SLUG_REGEX).max(80),
  nameEn: z.string().min(1).max(80),
  nameAr: z.string().min(1).max(80),
  isActive: z.boolean().optional().default(true),
});
export type BodyTypeCreate = z.infer<typeof BodyTypeCreateSchema>;

export const BodyTypeUpdateSchema = z
  .object({
    slug: z.string().regex(SLUG_REGEX).max(80).optional(),
    nameEn: z.string().min(1).max(80).optional(),
    nameAr: z.string().min(1).max(80).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field must be provided',
  });
export type BodyTypeUpdate = z.infer<typeof BodyTypeUpdateSchema>;

export const BodyTypeListResponseSchema = z.object({
  items: z.array(BodyTypeDtoSchema),
  total: z.number().int(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type BodyTypeListResponse = z.infer<typeof BodyTypeListResponseSchema>;

// ─── Shared filter ───────────────────────────────────────────────────────────

export const CatalogStatusFilterSchema = z.enum(['all', 'active', 'inactive']).optional();
export type CatalogStatusFilter = z.infer<typeof CatalogStatusFilterSchema>;

/**
 * Shared list-query schema for the three catalog list endpoints
 * (brands, body-types, brand→models). Mirrors the listings filter pagination
 * cap so cross-list pagination behaviour stays consistent.
 */
export const CatalogListQuerySchema = z.object({
  status: z.enum(['all', 'active', 'inactive']).optional(),
  q: z.string().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type CatalogListQuery = z.infer<typeof CatalogListQuerySchema>;
