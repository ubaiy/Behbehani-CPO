import { z } from 'zod';
import { listingStageSchema } from './listings.schemas.js';

/**
 * Pricing tier DTOs shared between API and admin.
 * Plan reference: Sprint 2 — aging discount engine, pricing tiers.
 *
 * discountBps: basis points, negative = discount (e.g. -200 = -2.0%).
 * totalReductionFils: BigInt serialised as string for JSON safety.
 */

export const PricingTierDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  daysThresholdMin: z.number().int().min(1).max(3650),
  discountBps: z.number().int().min(-5000).max(-50),
  stagesAffected: z.array(listingStageSchema).min(1).superRefine((stages, ctx) => {
    if (new Set(stages).size !== stages.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'stagesAffected must be unique' });
    }
  }),
  autoApply: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  updatedById: z.string().uuid().nullable(),
  updatedByName: z.string().nullable(),
});
export type PricingTierDto = z.infer<typeof PricingTierDtoSchema>;

export const PricingTierCreateSchema = z.object({
  name: z.string().min(1).max(120),
  daysThresholdMin: z.number().int().min(1).max(3650),
  discountBps: z.number().int().min(-5000).max(-50),
  stagesAffected: z.array(listingStageSchema).min(1).superRefine((stages, ctx) => {
    if (new Set(stages).size !== stages.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'stagesAffected must be unique' });
    }
  }),
  autoApply: z.boolean(),
});
export type PricingTierCreate = z.infer<typeof PricingTierCreateSchema>;

export const PricingTierUpdateSchema = PricingTierCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' },
);
export type PricingTierUpdate = z.infer<typeof PricingTierUpdateSchema>;

export const PricingTierListResponseSchema = z.object({
  items: z.array(PricingTierDtoSchema),
  total: z.number().int(),
});
export type PricingTierListResponse = z.infer<typeof PricingTierListResponseSchema>;

export const PricingPreviewRequestSchema = z.object({
  daysThresholdMin: z.number().int().min(1).max(3650),
  discountBps: z.number().int().min(-5000).max(-50),
  stagesAffected: z.array(listingStageSchema).min(1).superRefine((stages, ctx) => {
    if (new Set(stages).size !== stages.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'stagesAffected must be unique' });
    }
  }),
});
export type PricingPreviewRequest = z.infer<typeof PricingPreviewRequestSchema>;

export const PricingPreviewResponseSchema = z.object({
  qualifyingListings: z.number().int(),
  totalReductionFils: z.string(), // BigInt as string
  sampleListingIds: z.array(z.string().uuid()).max(5),
});
export type PricingPreviewResponse = z.infer<typeof PricingPreviewResponseSchema>;
