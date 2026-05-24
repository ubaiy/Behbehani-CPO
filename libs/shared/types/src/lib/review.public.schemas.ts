import { z } from 'zod';

/**
 * Customer review — public DTOs.
 *
 * v1.5.8 — customer reviews capture per SRS reviews block + MOBILE_API_CONTRACT v0.18 §2.
 *
 * Polymorphic target: a review can target either a CPO Listing or a Service
 * (concierge inspection | maintenance pickup request).
 *
 * customerDisplayName is derived at fetch time from User.fullName (not stored).
 * userId is never exposed in DTOs (privacy — anonymization per spec).
 *
 * Service + controller live in apps/api/src/reviews/.
 */

// ─── Target kind enums ────────────────────────────────────────────────────────

export const ReviewTargetKindSchema = z.enum(['listing', 'service']);
export type ReviewTargetKind = z.infer<typeof ReviewTargetKindSchema>;

export const ReviewServiceKindSchema = z.enum(['inspection', 'maintenance']);
export type ReviewServiceKind = z.infer<typeof ReviewServiceKindSchema>;

// ─── Polymorphic target (discriminated union) ─────────────────────────────────

export const ReviewTargetSchema = z.discriminatedUnion('kind', [
  z.object({
    kind:      z.literal('listing'),
    listingId: z.string().uuid(),
  }),
  z.object({
    kind:        z.literal('service'),
    serviceKind: ReviewServiceKindSchema,
    serviceId:   z.string().min(1),
  }),
]);
export type ReviewTarget = z.infer<typeof ReviewTargetSchema>;

// ─── DTO ──────────────────────────────────────────────────────────────────────

/**
 * Outbound review shape.
 * userId is intentionally absent — customerDisplayName carries the
 * anonymized first-name-last-initial form (e.g. "Abbas A.").
 */
export const ReviewDtoSchema = z.object({
  id:                  z.string(),
  customerDisplayName: z.string(),
  target:              ReviewTargetSchema,
  rating:              z.number().int().min(1).max(5),
  title:               z.string().max(80),
  body:                z.string().max(1000),
  createdAt:           z.string().datetime(),
  updatedAt:           z.string().datetime(),
});
export type ReviewDto = z.infer<typeof ReviewDtoSchema>;

// ─── Paginated list response ──────────────────────────────────────────────────

export const ReviewRatingHistogramSchema = z.object({
  1: z.number().int().min(0),
  2: z.number().int().min(0),
  3: z.number().int().min(0),
  4: z.number().int().min(0),
  5: z.number().int().min(0),
});
export type ReviewRatingHistogram = z.infer<typeof ReviewRatingHistogramSchema>;

export const ReviewListResponseSchema = z.object({
  items:           z.array(ReviewDtoSchema),
  total:           z.number().int().min(0),
  averageRating:   z.number().min(0).max(5),
  ratingHistogram: ReviewRatingHistogramSchema,
  page:            z.number().int().min(1),
  pageSize:        z.number().int().min(1),
});
export type ReviewListResponse = z.infer<typeof ReviewListResponseSchema>;

// ─── Create input ─────────────────────────────────────────────────────────────

export const CreateReviewInputSchema = z.object({
  target: ReviewTargetSchema,
  rating: z.number().int().min(1).max(5),
  title:  z.string().min(1).max(80),
  body:   z.string().min(1).max(1000),
});
export type CreateReviewInput = z.infer<typeof CreateReviewInputSchema>;

// ─── Error codes ──────────────────────────────────────────────────────────────

export const REVIEW_ERROR_CODES = [
  'REVIEW_NOT_FOUND',
  'REVIEW_TARGET_NOT_REVIEWABLE',
  'REVIEW_ALREADY_SUBMITTED',
] as const;
export type ReviewErrorCode = (typeof REVIEW_ERROR_CODES)[number];
