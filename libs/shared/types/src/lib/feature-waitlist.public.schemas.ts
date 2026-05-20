import { z } from 'zod';

/** v1.3.4 / v1.4.1 §5 — Coming-Soon shell opt-in. Guest-allowed. */

export const FeatureWaitlistInputSchema = z.object({
  featurePath: z.string().min(1).max(120),
  email:       z.string().email().max(254),
});
export type FeatureWaitlistInputDto = z.infer<typeof FeatureWaitlistInputSchema>;

/** 201 response when newly subscribed. */
export const FeatureWaitlistCreatedResponseSchema = z.object({
  subscribed: z.literal(true),
});
export type FeatureWaitlistCreatedResponseDto = z.infer<typeof FeatureWaitlistCreatedResponseSchema>;

/** 200 response when the (featurePath, email) pair was already in the waitlist. */
export const FeatureWaitlistAlreadyResponseSchema = z.object({
  subscribed:         z.literal(false),
  alreadySubscribed:  z.literal(true),
});
export type FeatureWaitlistAlreadyResponseDto = z.infer<typeof FeatureWaitlistAlreadyResponseSchema>;

export const FEATURE_WAITLIST_ERROR_CODES = [
  'INVALID_EMAIL',
  'INVALID_FEATURE_PATH',
] as const;
export type FeatureWaitlistErrorCode = (typeof FEATURE_WAITLIST_ERROR_CODES)[number];
