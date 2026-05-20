import { z } from 'zod';

/**
 * Audit-log DTOs shared between API and admin frontend.
 * Plan reference: SRS FR-ADM-021 (append-only audit trail).
 *
 * AuditLog.id is a BigInt in Prisma — serialised as a string in all DTOs.
 * outcome, actorName, and actorEmail are DTO-level fields derived/joined
 * server-side; they do not exist as columns on the AuditLog table.
 */

// ─── Outcome enum ──────────────────────────────────────────────────────────

export const AuditLogOutcomeSchema = z.enum(['success', 'denied', 'error']);
export type AuditLogOutcome = z.infer<typeof AuditLogOutcomeSchema>;

// ─── Filter ────────────────────────────────────────────────────────────────

export const AuditLogFilterSchema = z.object({
  actorId: z.string().uuid().optional(),
  actorQ: z.string().trim().max(200).optional(),
  action: z.string().max(200).optional(),
  actionPrefix: z.string().max(100).optional(),
  resource: z.string().max(100).optional(),
  resourceId: z.string().max(200).optional(),
  outcome: z.union([AuditLogOutcomeSchema, z.literal('all')]).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sort: z.enum(['newest', 'oldest', 'actor', 'action']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(250).default(25),
});
export type AuditLogFilter = z.infer<typeof AuditLogFilterSchema>;

// ─── Entry DTO ─────────────────────────────────────────────────────────────

export const AuditLogEntryDtoSchema = z.object({
  id: z.string(),              // BigInt serialised to string
  actorId: z.string().uuid().nullable(),
  actorName: z.string().nullable(),   // 'Unknown' if actor deleted; null for sign-in failures
  actorEmail: z.string().nullable(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().nullable(),
  outcome: AuditLogOutcomeSchema,
  before: z.unknown().nullable(),     // unstructured JSON — schema intentionally open
  after: z.unknown().nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type AuditLogEntryDto = z.infer<typeof AuditLogEntryDtoSchema>;

// ─── List response ─────────────────────────────────────────────────────────

export const AuditLogListResponseSchema = z.object({
  items: z.array(AuditLogEntryDtoSchema),
  total: z.number().int().min(0),          // total matching the current filter
  filteredFrom: z.number().int().min(0),   // total ALL audit log entries (pre-filter count)
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type AuditLogListResponse = z.infer<typeof AuditLogListResponseSchema>;

// ─── Distinct-value list responses (filter dropdown population) ─────────────

export const AuditLogActionListResponseSchema = z.object({
  actions: z.array(z.string()),
});
export type AuditLogActionListResponse = z.infer<typeof AuditLogActionListResponseSchema>;

export const AuditLogResourceListResponseSchema = z.object({
  resources: z.array(z.string()),
});
export type AuditLogResourceListResponse = z.infer<typeof AuditLogResourceListResponseSchema>;

// ─── Export request ────────────────────────────────────────────────────────

export const AuditLogExportRequestSchema = AuditLogFilterSchema.omit({
  page: true,
  pageSize: true,
}).extend({
  format: z.literal('csv').default('csv'),
});
export type AuditLogExportRequest = z.infer<typeof AuditLogExportRequestSchema>;
