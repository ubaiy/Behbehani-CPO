import { z } from 'zod';
import { listingStageSchema } from './listings.schemas.js';
import { AuditLogOutcomeSchema } from './audit-log.schemas.js';
import { AgingRunStatusSchema } from './aging.schemas.js';

/**
 * Dashboard KPI DTOs for GET /v1/admin/dashboard/kpis.
 * Plan reference: Sprint 1 — admin dashboard (single aggregation call).
 *
 * Money values are fils-as-string (BigInt-safe).
 * Percentages expressed as basis-point integers where applicable.
 * deltaPct is a plain number with at most 2 decimal places (e.g. 4.21).
 */

// ── KPI delta ────────────────────────────────────────────────────────────────

export const DeltaSignSchema = z.enum(['up', 'down', 'flat']);
export type DeltaSign = z.infer<typeof DeltaSignSchema>;

export const DeltaSchema = z.object({
  sign: DeltaSignSchema,
  /** e.g. 4.21 means +4.21% — at most 2 decimal places */
  pct: z.number().multipleOf(0.01),
  /** human-readable comparison period, e.g. 'last week', 'last 24h' */
  vsPeriod: z.string(),
});
export type Delta = z.infer<typeof DeltaSchema>;

// ── Top KPI tile ─────────────────────────────────────────────────────────────

export const DashboardKpiTileSchema = z.object({
  /** Numeric count, or fils-as-string when the tile shows a money value. */
  value: z.union([z.number().int(), z.string()]),
  caption: z.string(),
  /** null when no comparison period is available yet. */
  delta: DeltaSchema.nullable(),
  /** 'warn' renders the tile with a red tint (aging 45+ d). */
  tone: z.enum(['neutral', 'warn']),
});
export type DashboardKpiTile = z.infer<typeof DashboardKpiTileSchema>;

// ── Daily value strip ────────────────────────────────────────────────────────

export const DailyValueTileSchema = z.object({
  key: z.enum(['reservations', 'orders', 'financing_apps_open', 'tradein_valuations']),
  label: z.string(),
  /** null when the backing module has not shipped yet — render a placeholder. */
  value: z.number().int().nullable(),
  /** e.g. 'Sprint 5'; null once the module is live. */
  sprintTag: z.string().nullable(),
});
export type DailyValueTile = z.infer<typeof DailyValueTileSchema>;

// ── Pipeline at a glance ─────────────────────────────────────────────────────

export const PipelineStageCountSchema = z.object({
  stage: listingStageSchema,
  count: z.number().int().min(0),
});
export type PipelineStageCount = z.infer<typeof PipelineStageCountSchema>;

export const PipelineSnapshotSchema = z.object({
  /** Exactly 10 entries — one per stage in enum declaration order. */
  stages: z.array(PipelineStageCountSchema).length(10),
  /** null when no stage has stuck vehicles (or data not yet available). */
  mostStuckStage: z
    .object({
      stage: listingStageSchema,
      avgDays: z.number().int(),
    })
    .nullable(),
});
export type PipelineSnapshot = z.infer<typeof PipelineSnapshotSchema>;

// ── Aging engine status (slim dashboard projection) ──────────────────────────

export const DashboardAgingStatusSchema = z.object({
  enabled: z.boolean(),
  paused: z.boolean(),
  /** null when the engine has never run. */
  lastRun: z
    .object({
      finishedAt: z.string().datetime(),
      status: AgingRunStatusSchema,
      processedCount: z.number().int(),
      appliedCount: z.number().int(),
    })
    .nullable(),
  /** null when scheduling is disabled or not yet known. */
  nextScheduledAt: z.string().datetime().nullable(),
  activeDiscounts: z.object({
    listingCount: z.number().int(),
    /** Sum of all active discount reductions in fils (BigInt as string). */
    totalReductionFils: z.string(),
  }),
});
export type DashboardAgingStatus = z.infer<typeof DashboardAgingStatusSchema>;

// ── System health ────────────────────────────────────────────────────────────

export const DashboardSystemHealthSchema = z.object({
  media: z.object({
    photos: z.number().int(),
    media360: z.number().int(),
    videos: z.number().int(),
  }),
  /**
   * Omitted (null) when the actor lacks super_admin or general_manager role.
   * Server must set the field to null rather than omitting the key entirely
   * so the client can distinguish "no permission" from "zero users".
   */
  users: z
    .object({
      active: z.number().int(),
      locked: z.number().int(),
      disabled: z.number().int(),
    })
    .nullable(),
  pricingTiers: z.object({
    active: z.number().int(),
  }),
});
export type DashboardSystemHealth = z.infer<typeof DashboardSystemHealthSchema>;

// ── Recent activity (slim audit-log projection, no before/after blobs) ───────

export const DashboardActivityEntrySchema = z.object({
  /** AuditLog.id — BigInt serialised as string. */
  id: z.string(),
  createdAt: z.string().datetime(),
  actorName: z.string().nullable(),
  actorEmail: z.string().nullable(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().nullable(),
  outcome: AuditLogOutcomeSchema,
});
export type DashboardActivityEntry = z.infer<typeof DashboardActivityEntrySchema>;

// ── Quick action visibility ──────────────────────────────────────────────────

export const DashboardQuickActionSchema = z.object({
  key: z.enum(['new_vehicle', 'run_aging_now', 'create_user', 'view_audit_log']),
  label: z.string(),
  /** Route already resolved by the server (locale-prefixed if needed). */
  href: z.string(),
  variant: z.enum(['primary', 'secondary']),
});
export type DashboardQuickAction = z.infer<typeof DashboardQuickActionSchema>;

// ── Top-level response ───────────────────────────────────────────────────────

export const DashboardKpisDtoSchema = z.object({
  /** First name of the authenticated actor for the greeting banner. */
  greetingName: z.string(),
  /** ISO-8601 timestamp used for the "Last refreshed" caption. */
  generatedAt: z.string().datetime(),

  topKpis: z.object({
    activeListings: DashboardKpiTileSchema,
    /** Operator-curated featured listings (listings with `featuredAt != null`). */
    featuredListings: DashboardKpiTileSchema,
    aging20to44: DashboardKpiTileSchema,
    aging45plus: DashboardKpiTileSchema,
    /** value is fils-as-string (BigInt-safe). */
    monthlyDiscountAppliedFils: DashboardKpiTileSchema,
  }),

  /** Always exactly 4 entries, one per DailyValueTile key. */
  dailyValues: z.array(DailyValueTileSchema).length(4),

  pipeline: PipelineSnapshotSchema,

  /** null when the actor's role does not grant visibility of aging controls. */
  agingEngine: DashboardAgingStatusSchema.nullable(),

  systemHealth: DashboardSystemHealthSchema,

  /** At most 10 most-recent audit entries, newest-first. */
  recentActivity: z.array(DashboardActivityEntrySchema).max(10),

  /** Empty array when the actor has no actionable quick actions. */
  quickActions: z.array(DashboardQuickActionSchema),
});
export type DashboardKpisDto = z.infer<typeof DashboardKpisDtoSchema>;
