import { z } from 'zod';

/**
 * v1.5.25 — Lead capture + admin Leads queue DTOs.
 *
 * Public surface: POST /v1/public/leads (anonymous, rate-limited, idempotency-keyed)
 * Admin surface:  GET/PATCH /v1/admin/leads, POST /v1/admin/leads/:id/assign
 */

// ─── Status enum ─────────────────────────────────────────────────────────────

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'dropped'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LeadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'converted', 'dropped']);

// ─── Source enum ─────────────────────────────────────────────────────────────
//
// v1.5.30 (closes A v1.5-D17 §4 LeadSource drift): replaced the v1.5.25
// 3-value ['vdp', 'callback', 'other'] with the 4 explicit per-entry-point
// values A proposed. Lets the admin queue filter cleanly by where the lead
// originated (no more `[vdp_callback]` message prefixes from A's workaround).
//
// Lead.source is a plain `String` column in Prisma (not a Postgres enum), so
// no DB migration is needed; any legacy demo rows with 'vdp'/'callback' simply
// won't match the new chip filters but still appear in the unfiltered list.

export const LEAD_SOURCES = [
  'vdp_callback',    // VDP "Request callback" button (with optional contact form)
  'vdp_whatsapp',    // VDP "Chat on WhatsApp" button (captures intent pre-redirect)
  'compare_page',    // /compare page "Talk to a sales agent" CTA
  'other',           // catch-all for future entry points / legacy data
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LeadSourceSchema = z.enum(LEAD_SOURCES);

// ─── Public create input ──────────────────────────────────────────────────────

/**
 * POST /v1/public/leads — anonymous lead capture.
 * Idempotency-Key header handled at controller level.
 */
export const CreateLeadPublicInputSchema = z.object({
  customerName:  z.string().trim().min(2).max(120),
  customerPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-().]{7,20}$/, 'Invalid phone number')
    .max(20),
  customerEmail: z.string().trim().email().max(255).optional(),
  message:       z.string().trim().max(500).optional(),
  listingId:     z.string().uuid().optional(),
  source:        LeadSourceSchema.default('vdp_callback'),
});
export type CreateLeadPublicInput = z.infer<typeof CreateLeadPublicInputSchema>;

// ─── Embedded admin user (assignee) ──────────────────────────────────────────

export const LeadAssignedUserSchema = z.object({
  id:       z.string().uuid(),
  fullName: z.string(),
  email:    z.string().nullable(),
}).nullable();
export type LeadAssignedUser = z.infer<typeof LeadAssignedUserSchema>;

// ─── Embedded listing summary ─────────────────────────────────────────────────

export const LeadListingSchema = z.object({
  id:          z.string().uuid(),
  stockNumber: z.string(),
  titleEn:     z.string(),
}).nullable();
export type LeadListing = z.infer<typeof LeadListingSchema>;

// ─── Full admin DTO ───────────────────────────────────────────────────────────

export const LeadDtoSchema = z.object({
  id:             z.string().uuid(),
  listing:        LeadListingSchema,
  customerName:   z.string(),
  customerPhone:  z.string(),
  customerEmail:  z.string().nullable(),
  message:        z.string().nullable(),
  source:         z.string(),
  status:         LeadStatusSchema,
  notes:          z.string().nullable(),
  assignedTo:     LeadAssignedUserSchema,
  contactedAt:    z.string().datetime().nullable(),
  resolvedAt:     z.string().datetime().nullable(),
  idempotencyKey: z.string().nullable(),
  createdAt:      z.string().datetime(),
  updatedAt:      z.string().datetime(),
});
export type LeadDto = z.infer<typeof LeadDtoSchema>;

// ─── List filter ──────────────────────────────────────────────────────────────

export const LeadListFilterSchema = z.object({
  status:   LeadStatusSchema.optional(),
  search:   z.string().max(200).optional(),   // phone or email partial match
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type LeadListFilter = z.infer<typeof LeadListFilterSchema>;

// ─── Status counts ────────────────────────────────────────────────────────────

export const LeadStatusCountsSchema = z.object({
  new:       z.number().int().nonnegative(),
  contacted: z.number().int().nonnegative(),
  qualified: z.number().int().nonnegative(),
  converted: z.number().int().nonnegative(),
  dropped:   z.number().int().nonnegative(),
});
export type LeadStatusCounts = z.infer<typeof LeadStatusCountsSchema>;

// ─── List response ────────────────────────────────────────────────────────────

export const LeadListResponseSchema = z.object({
  items:        z.array(LeadDtoSchema),
  total:        z.number().int().nonnegative(),
  page:         z.number().int().min(1),
  pageSize:     z.number().int().min(1),
  statusCounts: LeadStatusCountsSchema,
});
export type LeadListResponse = z.infer<typeof LeadListResponseSchema>;

// ─── Admin PATCH input ────────────────────────────────────────────────────────

/**
 * State machine:
 *   new → contacted → qualified → converted | dropped
 *   new → dropped (direct drop)
 */
export const UpdateLeadInputSchema = z.object({
  status: LeadStatusSchema.optional(),
  notes:  z.string().max(10000).optional().nullable(),
});
export type UpdateLeadInput = z.infer<typeof UpdateLeadInputSchema>;

// ─── Admin assign input ───────────────────────────────────────────────────────

export const AssignLeadInputSchema = z.object({
  userId: z.string().uuid(),
});
export type AssignLeadInput = z.infer<typeof AssignLeadInputSchema>;

// ─── Error codes ──────────────────────────────────────────────────────────────

export const LEAD_ERROR_CODES = [
  'LEAD_NOT_FOUND',
  'LEAD_INVALID_STATUS_TRANSITION',
  'LEAD_IDEMPOTENCY_CONFLICT',
  'LEAD_ASSIGNEE_NOT_FOUND',
] as const;
export type LeadErrorCode = (typeof LEAD_ERROR_CODES)[number];

// ─── Public create response ───────────────────────────────────────────────────

export const CreateLeadPublicResponseSchema = z.object({
  id:        z.string().uuid(),
  status:    LeadStatusSchema,
  createdAt: z.string().datetime(),
});
export type CreateLeadPublicResponse = z.infer<typeof CreateLeadPublicResponseSchema>;
