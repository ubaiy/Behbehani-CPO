/**
 * Offer / Valuation module — shared Zod schemas (Phase 4).
 *
 * §16 D1 override: counter-offers are UNLIMITED rounds. Status enum includes
 * `countered_by_admin`. `AdminCounterSchema` added for the admin-counter
 * endpoint (PATCH /v1/admin/offers/:id/counter).
 *
 * §16 D5 override: customer acceptance atomically creates a draft Listing.
 * The `submitCustomerResponse` accept response includes `listingStockNumber`.
 */

import { z } from 'zod';

// ─── Enum ─────────────────────────────────────────────────────────────────────

export const OFFER_STATUSES = [
  'drafted',
  'sent',
  'countered_by_customer',
  'countered_by_admin',
  'accepted',
  'declined',
  'expired',
  'withdrawn',
] as const;

export const OfferStatusSchema = z.enum(OFFER_STATUSES);
export type OfferStatus = z.infer<typeof OfferStatusSchema>;

// ─── Admin POST body — create a new offer ─────────────────────────────────────

export const CreateOfferSchema = z.object({
  offerAmountFils: z.number().int().positive(),
  // ISO 8601 datetime; service validates 1–30 days from now.
  validUntil: z.string().datetime(),
  notes: z.string().max(2000).optional(),
  // Re-issuance: links a new offer to a previously declined/expired one.
  previousOfferId: z.string().uuid().optional(),
});
export type CreateOfferDto = z.infer<typeof CreateOfferSchema>;

// ─── Admin PATCH body — admin counter-offer (§16 D1) ─────────────────────────

export const AdminCounterSchema = z.object({
  counterAmountFils: z.number().int().positive(),
  counterNotes: z.string().max(2000).optional(),
});
export type AdminCounterDto = z.infer<typeof AdminCounterSchema>;

// ─── Admin GET list — offer summary row ───────────────────────────────────────

export const OfferSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  inspectionId: z.string().uuid(),
  bookingRef: z.string(),
  customerId: z.string().uuid(),
  customerFullName: z.string(),
  vehicleLabel: z.string(),        // e.g. "2021 Toyota Camry"
  offerAmountFils: z.number(),
  counterAmountFils: z.number().nullable(),
  adminCounterAmountFils: z.number().nullable(),
  validUntil: z.string().datetime(),
  status: OfferStatusSchema,
  createdAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable(),
  ageMinutes: z.number(),          // time since creation — used in the admin queue
});
export type OfferSummaryDto = z.infer<typeof OfferSummaryDtoSchema>;

// ─── Admin GET single — full offer with re-issuance chain ────────────────────

export const OfferDetailDtoSchema = OfferSummaryDtoSchema.extend({
  notes: z.string().nullable(),
  counterNotes: z.string().nullable(),
  adminCounterNotes: z.string().nullable(),
  respondedIp: z.string().nullable(),
  respondedUserAgent: z.string().nullable(),
  publicToken: z.string(),
  publicTokenExpiresAt: z.string().datetime(),
  createdById: z.string().uuid(),
  createdByFullName: z.string(),
  // Full chain — ordered oldest-first; enables the admin "offer history" timeline.
  offerHistory: z.array(OfferSummaryDtoSchema),
  // F3: populated once the offer reaches 'accepted' (§16 D5 acceptance flow).
  // Null before acceptance or if listing creation was not triggered.
  listingStockNumber: z.string().nullable(),
  listingId: z.string().uuid().nullable(),
});
export type OfferDetailDto = z.infer<typeof OfferDetailDtoSchema>;

// ─── Public GET — customer-facing offer view (sanitised) ─────────────────────

export const PublicOfferViewSchema = z.object({
  bookingRef: z.string(),
  vehicleLabel: z.string(),
  vehicleYear: z.number().nullable(),
  vehicleBrandName: z.string().nullable(),
  vehicleModelName: z.string().nullable(),
  offerAmountFils: z.number(),
  offerAmountKwd: z.string(),      // pre-formatted "KWD 1,500.000"
  validUntil: z.string().datetime(),
  status: OfferStatusSchema,
  // Current counter amounts (customer's or admin's latest counter).
  counterAmountFils: z.number().nullable(),
  adminCounterAmountFils: z.number().nullable(),
  // Whether customer can act: only true when status is 'sent' or
  // 'countered_by_admin' (admin countered, awaiting customer decision).
  canRespond: z.boolean(),
  publicTokenExpiresAt: z.string().datetime(),
  // Linked inspection UUID — enables mobile/web to deep-link from the offer
  // page to the inspection-report viewer (e.g. /inspections/:id). Surfaced
  // in v1.5.4 to unblock C v0.16 carry-over (mock `test-inspection-id` ref
  // in apps/mobile/app/offers/[token]/view.tsx "View Inspection" CTA).
  inspectionReportId: z.string().uuid(),
});
export type PublicOfferView = z.infer<typeof PublicOfferViewSchema>;

// ─── Public POST — customer response ──────────────────────────────────────────

export const CustomerOfferResponseSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept') }),
  z.object({
    action: z.literal('decline'),
    reason: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('counter'),
    counterAmountFils: z.number().int().positive(),
    counterNotes: z.string().max(500).optional(),
  }),
]);
export type CustomerOfferResponseDto = z.infer<typeof CustomerOfferResponseSchema>;

// ─── Admin list filters ───────────────────────────────────────────────────────

export const OfferListFilterSchema = z.object({
  status: OfferStatusSchema.optional(),
  q: z.string().max(100).optional(),           // customer name / bookingRef search
  customerId: z.string().uuid().optional(),
  inspectionId: z.string().uuid().optional(),
  minAgeDays: z.coerce.number().int().nonnegative().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type OfferListFilter = z.infer<typeof OfferListFilterSchema>;

// ─── Admin list response ──────────────────────────────────────────────────────

export const OfferListResponseSchema = z.object({
  data: z.array(OfferSummaryDtoSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});
export type OfferListResponse = z.infer<typeof OfferListResponseSchema>;
