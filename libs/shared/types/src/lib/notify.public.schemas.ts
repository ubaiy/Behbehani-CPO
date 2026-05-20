import { z } from 'zod';

/**
 * Public notification DTOs — used by storefront forms.
 *
 * Per `CONCIERGE_INSPECTION_API_CONTRACT.md` v0.7 §2 item 3, this file is
 * owned by Session B (additive schemas). Session A's controller imports the
 * request type and validates with `WaitlistRequestSchema.parse()` before
 * calling the B-owned `waitlistService.addToWaitlist()`.
 */

/** Body for POST /v1/public/notify/self-service-waitlist */
export const WaitlistRequestSchema = z.object({
  email: z.string().email().max(254),
  /** Two-letter or BCP-47 locale tag — informational only. */
  locale: z.string().max(8).optional(),
  /** Originating page/UTM — informational only. */
  referrer: z.string().max(255).optional(),
});
export type WaitlistRequestDto = z.infer<typeof WaitlistRequestSchema>;

export const WaitlistResponseSchema = z.object({
  /** True if the email was newly added; false if it was already on the list. */
  added: z.boolean(),
});
export type WaitlistResponseDto = z.infer<typeof WaitlistResponseSchema>;
