import { z } from 'zod';

/**
 * Customer favourites — public DTOs.
 *
 * Contract: CONCIERGE_INSPECTION_API_CONTRACT.md v1.2.0 §4 + v1.2.1 §4.6.
 *
 * Wired by Session A onto `/v1/public/me/saved-listings*` + the Q4 check
 * endpoint. Service exports live in B's `apps/api/src/saved-listings/`.
 */

// ─── Summary card on the my-favourites listing ──────────────────────────────

export const SavedListingSummarySchema = z.object({
  listingId: z.string().uuid(),
  stockNumber: z.string(),
  titleEn: z.string(),
  titleAr: z.string().nullable(),
  priceFils: z.union([z.bigint(), z.string()]),
  heroPhotoUrl: z.string().url().nullable(),
  savedAt: z.string().datetime(),
});
export type SavedListingSummary = z.infer<typeof SavedListingSummarySchema>;

// ─── Paginated list ─────────────────────────────────────────────────────────

export const SavedListingListResponseSchema = z.object({
  items: z.array(SavedListingSummarySchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type SavedListingListResponse = z.infer<typeof SavedListingListResponseSchema>;

// ─── Save / unsave action responses ─────────────────────────────────────────

export const SaveListingResponseSchema = z.object({
  /** True only on first successful save; false for idempotent re-save. */
  saved: z.boolean(),
  createdAt: z.string().datetime(),
});
export type SaveListingResponse = z.infer<typeof SaveListingResponseSchema>;

export const UnsaveListingResponseSchema = z.object({
  /** True if a row was actually deleted; false for idempotent re-unsave. */
  removed: z.boolean(),
});
export type UnsaveListingResponse = z.infer<typeof UnsaveListingResponseSchema>;

// ─── Bulk check (Q4 light endpoint) ─────────────────────────────────────────

export const CheckSavedListingsQuerySchema = z.object({
  /** Comma-separated UUIDs at the query-string layer; controller splits + validates. */
  listingIds: z.array(z.string().uuid()).min(1).max(50),
});
export type CheckSavedListingsQuery = z.infer<typeof CheckSavedListingsQuerySchema>;

export const CheckSavedListingsResponseSchema = z.object({
  savedListingIds: z.array(z.string().uuid()),
});
export type CheckSavedListingsResponse = z.infer<typeof CheckSavedListingsResponseSchema>;

// ─── Error codes ────────────────────────────────────────────────────────────

export const SAVED_LISTING_ERROR_CODES = ['LISTING_NOT_FOUND'] as const;
export type SavedListingErrorCode = (typeof SAVED_LISTING_ERROR_CODES)[number];
