import { z } from 'zod';

/**
 * Saved Searches — public DTOs.
 *
 * v1.6 — customer-owned browse-filter presets for /v1/public/me/saved-searches.
 *
 * Service + controller live in apps/api/src/saved-searches/.
 * All filter fields in SavedSearchQueryPayloadSchema mirror the storefront browse
 * filter spec (snake_case keys per existing URL query convention).
 */

// ─── Query payload (filter preset stored in the queryPayload JSONB column) ────

/**
 * The structured filter payload stored inside SavedSearch.queryPayload.
 * All fields are optional individually; at least one must be set (refine enforced).
 */
export const SavedSearchQueryPayloadSchema = z
  .object({
    brands: z.array(z.string().min(1)).optional(),
    models: z.array(z.string().min(1)).optional(),
    year_min: z.number().int().min(1900).max(2100).optional(),
    year_max: z.number().int().min(1900).max(2100).optional(),
    price_min_fils: z.number().int().min(0).optional(),
    price_max_fils: z.number().int().min(0).optional(),
    monthly_payment_min_fils: z.number().int().min(0).optional(),
    monthly_payment_max_fils: z.number().int().min(0).optional(),
    mileage_min_km: z.number().int().min(0).optional(),
    mileage_max_km: z.number().int().min(0).optional(),
    body_types: z.array(z.string().min(1)).optional(),
    transmissions: z
      .array(z.enum(['automatic', 'manual', 'cvt']))
      .optional(),
    fuel_types: z
      .array(z.enum(['petrol', 'diesel', 'hybrid', 'electric']))
      .optional(),
    exterior_colors: z.array(z.string().min(1)).optional(),
    regional_specs: z
      .array(z.enum(['gcc', 'american', 'european', 'japanese']))
      .optional(),
    inspection_flag: z.boolean().optional(),
    warranty_flag: z.boolean().optional(),
    sort_by: z
      .enum(['price_asc', 'price_desc', 'year_desc', 'mileage_asc', 'newest'])
      .optional(),
  })
  .refine(
    (data) =>
      Object.values(data).some(
        (v) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0),
      ),
    { message: 'At least one filter field must be set' },
  );

export type SavedSearchQueryPayload = z.infer<typeof SavedSearchQueryPayloadSchema>;

// ─── Full DTO (returned by GET /list and GET /:id) ───────────────────────────

export const SavedSearchDtoSchema = z.object({
  id: z.string(),
  userId: z.string().uuid(),
  name: z.string(),
  queryPayload: SavedSearchQueryPayloadSchema,
  notifyOnMatch: z.boolean(),
  lastNotifiedAt: z.string().datetime().nullable(),
  matchCountAtCreation: z.number().int().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SavedSearchDto = z.infer<typeof SavedSearchDtoSchema>;

// ─── Create input (POST body) ────────────────────────────────────────────────

export const CreateSavedSearchInputSchema = z.object({
  name: z.string().min(1).max(120),
  queryPayload: SavedSearchQueryPayloadSchema,
  notifyOnMatch: z.boolean().optional(),
  matchCountAtCreation: z.number().int().min(0).optional(),
});

export type CreateSavedSearchInput = z.infer<typeof CreateSavedSearchInputSchema>;

// ─── Update input (PATCH body) ───────────────────────────────────────────────

export const UpdateSavedSearchInputSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    queryPayload: SavedSearchQueryPayloadSchema.optional(),
    notifyOnMatch: z.boolean().optional(),
    matchCountAtCreation: z.number().int().min(0).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateSavedSearchInput = z.infer<typeof UpdateSavedSearchInputSchema>;

// ─── Paginated list response ─────────────────────────────────────────────────

export const SavedSearchListResponseSchema = z.object({
  items: z.array(SavedSearchDtoSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});

export type SavedSearchListResponse = z.infer<typeof SavedSearchListResponseSchema>;

// ─── Error codes ─────────────────────────────────────────────────────────────

export const SAVED_SEARCH_ERROR_CODES = ['SAVED_SEARCH_NOT_FOUND'] as const;
export type SavedSearchErrorCode = (typeof SAVED_SEARCH_ERROR_CODES)[number];
