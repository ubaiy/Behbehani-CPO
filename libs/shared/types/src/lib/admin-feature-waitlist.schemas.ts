import { z } from 'zod';

/**
 * v1.5.13 — Admin feature-waitlist queue DTOs.
 *
 * The FeatureWaitlist model uses featurePath (a URL slug like "/account/maintenance")
 * rather than a typed enum. Admin views group by featurePath and count per path.
 *
 * Mirrors admin-maintenance.schemas.ts structure.
 */

// ─── List row ─────────────────────────────────────────────────────────────────

export const AdminFeatureWaitlistEntrySchema = z.object({
  id:          z.string().uuid(),
  featurePath: z.string(),           // e.g. "/account/maintenance"
  email:       z.string().email(),
  userId:      z.string().uuid().nullable(),  // null when guest subscriber
  createdAt:   z.string().datetime(),
});
export type AdminFeatureWaitlistEntryDto = z.infer<typeof AdminFeatureWaitlistEntrySchema>;

// ─── Feature path counts (across ALL rows, not just filtered page) ─────────────

// Record<featurePath, count> — keys are whatever featurePath values exist in DB.
export const AdminFeatureWaitlistPathCountsSchema = z.record(z.string(), z.number().int().nonnegative());
export type AdminFeatureWaitlistPathCounts = z.infer<typeof AdminFeatureWaitlistPathCountsSchema>;

// ─── List response ─────────────────────────────────────────────────────────────

export const AdminFeatureWaitlistListResponseSchema = z.object({
  items:         z.array(AdminFeatureWaitlistEntrySchema),
  total:         z.number().int().nonnegative(),
  page:          z.number().int().min(1),
  pageSize:      z.number().int().min(1),
  pathCounts:    AdminFeatureWaitlistPathCountsSchema,  // across ALL rows (unfiltered by search)
});
export type AdminFeatureWaitlistListResponseDto = z.infer<typeof AdminFeatureWaitlistListResponseSchema>;

// ─── List query filter — Zod-validated on server ──────────────────────────────

/**
 * Query params for GET /v1/admin/feature-waitlists
 *
 * Validation rules:
 *   featurePath — optional; matched exactly or as prefix (e.g. "/account/maintenance")
 *   search      — optional; min 1 max 120 chars; matches email or featurePath substring
 *   page        — coerced int, positive, default 1
 *   pageSize    — coerced int, positive, max 100, default 20
 */
export const AdminFeatureWaitlistListFilterSchema = z.object({
  featurePath: z.string().min(1).max(120).optional(),
  search:      z.string().min(1).max(120).optional(),
  page:        z.coerce.number().int().positive().default(1),
  pageSize:    z.coerce.number().int().positive().max(100).default(20),
});
export type AdminFeatureWaitlistListFilterDto = z.infer<typeof AdminFeatureWaitlistListFilterSchema>;

// ─── CSV export query filter ───────────────────────────────────────────────────

/**
 * Query params for GET /v1/admin/feature-waitlists/export
 *
 * featurePath — optional; when provided, filters CSV to that path only.
 */
export const AdminFeatureWaitlistExportFilterSchema = z.object({
  featurePath: z.string().min(1).max(120).optional(),
});
export type AdminFeatureWaitlistExportFilterDto = z.infer<typeof AdminFeatureWaitlistExportFilterSchema>;

// ─── Error codes ──────────────────────────────────────────────────────────────

export const ADMIN_FEATURE_WAITLIST_ERROR_CODES = [
  'WAITLIST_NOT_FOUND',
  'WAITLIST_EXPORT_CAP_EXCEEDED',
] as const;
export type AdminFeatureWaitlistErrorCode = (typeof ADMIN_FEATURE_WAITLIST_ERROR_CODES)[number];

/** Max rows returned by the CSV export endpoint (hard server cap). */
export const WAITLIST_EXPORT_MAX_ROWS = 10_000;
