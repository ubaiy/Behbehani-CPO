import { z } from 'zod';
import { listingStageSchema } from './listings.schemas.js';

/**
 * Aging engine DTOs shared between API and admin.
 * Plan reference: Sprint 2 — aging discount engine (20d / 45d thresholds).
 *
 * BigInt fields (fils amounts, AppliedDiscount.id) are serialised as strings
 * for JSON safety — clients parse them with BigInt() or display directly.
 */

export const AgingRunStatusSchema = z.enum(['running', 'success', 'skipped', 'error']);
export type AgingRunStatus = z.infer<typeof AgingRunStatusSchema>;

export const AgingRunDtoSchema = z.object({
  id: z.string().uuid(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  status: AgingRunStatusSchema,
  processedCount: z.number().int(),
  appliedCount: z.number().int(),
  totalReductionFils: z.string(), // BigInt as string
  errorMessage: z.string().nullable(),
  triggeredByName: z.string().nullable(), // null = scheduled
});
export type AgingRunDto = z.infer<typeof AgingRunDtoSchema>;

export const AgingEngineStatusDtoSchema = z.object({
  enabled: z.boolean(),
  paused: z.boolean(),
  nextScheduledAt: z.string().datetime().nullable(),
  lastRun: AgingRunDtoSchema.nullable(),
  totals: z.object({
    activeListings: z.number().int(),
    aging20to44: z.number().int(),
    aging45plus: z.number().int(),
    monthlyDiscountAppliedFils: z.string(), // BigInt as string
  }),
});
export type AgingEngineStatusDto = z.infer<typeof AgingEngineStatusDtoSchema>;

export const AppliedDiscountDtoSchema = z.object({
  id: z.string(),         // BigInt as string
  listingId: z.string().uuid(),
  listingStockNumber: z.string(),
  listingTitle: z.string(),
  vinMasked: z.string(),
  stage: listingStageSchema,
  daysOnLot: z.number().int(),
  tierId: z.string().uuid(),
  tierName: z.string(),
  discountBps: z.number().int(),
  fromFils: z.string(),   // BigInt as string
  toFils: z.string(),     // BigInt as string
  appliedAt: z.string().datetime(),
  revertedAt: z.string().datetime().nullable(),
});
export type AppliedDiscountDto = z.infer<typeof AppliedDiscountDtoSchema>;

export const AgingDistributionBucketSchema = z.object({
  label: z.string(),
  daysFrom: z.number().int(),
  daysToInclusive: z.number().int().nullable(),
  count: z.number().int(),
});
export type AgingDistributionBucket = z.infer<typeof AgingDistributionBucketSchema>;

export const AgingDistributionSchema = z.object({
  buckets: z.array(AgingDistributionBucketSchema),
});
export type AgingDistribution = z.infer<typeof AgingDistributionSchema>;

export const AgingActiveDiscountListResponseSchema = z.object({
  items: z.array(AppliedDiscountDtoSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export type AgingActiveDiscountListResponse = z.infer<typeof AgingActiveDiscountListResponseSchema>;

export const AgingRunNowRequestSchema = z.object({
  dryRun: z.boolean().optional(),
});
export type AgingRunNowRequest = z.infer<typeof AgingRunNowRequestSchema>;

export const AgingPauseRequestSchema = z.object({
  paused: z.boolean(),
});
export type AgingPauseRequest = z.infer<typeof AgingPauseRequestSchema>;
