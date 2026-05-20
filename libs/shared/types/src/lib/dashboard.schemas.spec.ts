/**
 * Zod contract tests for dashboard schemas.
 *
 * Locks in the boundaries / refinements that would silently break the
 * admin dashboard contract if changed:
 *   - DeltaSchema.pct rejects > 2 decimal places (`multipleOf(0.01)`)
 *   - DeltaSchema.sign enum coverage
 *   - DashboardKpiTileSchema.value accepts BOTH number and string
 *   - PipelineSnapshotSchema.stages requires exactly 10 entries
 *   - DailyValueTileSchema.key enum coverage
 *   - DashboardQuickActionSchema.key enum coverage
 *   - DashboardActivityEntrySchema.outcome is the audit-log enum
 */

import {
  DeltaSchema,
  DeltaSignSchema,
  DashboardKpiTileSchema,
  DailyValueTileSchema,
  PipelineSnapshotSchema,
  DashboardQuickActionSchema,
  DashboardActivityEntrySchema,
} from './dashboard.schemas.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEN_STAGE_NAMES = [
  'acquired',
  'inbound',
  'inspection',
  'photoshoot',
  'reconditioning',
  'listed',
  'reserved',
  'sold',
  'delivered',
  'closed',
] as const;

const makePipelineStages = (count = 10) =>
  TEN_STAGE_NAMES.slice(0, count).map((stage) => ({ stage, count: 0 }));

// ─── DeltaSchema.pct decimal-place guard ─────────────────────────────────────

describe('DeltaSchema — pct multipleOf(0.01)', () => {
  it('accepts pct with at most 2 decimal places', () => {
    expect(DeltaSchema.safeParse({ sign: 'up', pct: 4.21, vsPeriod: 'last week' }).success).toBe(
      true,
    );
    expect(DeltaSchema.safeParse({ sign: 'up', pct: 4.2, vsPeriod: 'x' }).success).toBe(true);
    expect(DeltaSchema.safeParse({ sign: 'up', pct: 4, vsPeriod: 'x' }).success).toBe(true);
    expect(DeltaSchema.safeParse({ sign: 'flat', pct: 0, vsPeriod: 'x' }).success).toBe(true);
  });

  it('rejects pct with > 2 decimal places', () => {
    expect(DeltaSchema.safeParse({ sign: 'up', pct: 4.219, vsPeriod: 'x' }).success).toBe(false);
    expect(DeltaSchema.safeParse({ sign: 'up', pct: 0.001, vsPeriod: 'x' }).success).toBe(false);
  });
});

// ─── DeltaSignSchema enum coverage ──────────────────────────────────────────

describe('DeltaSignSchema — sign enum', () => {
  it.each(['up', 'down', 'flat'])('accepts sign: %s', (sign) => {
    expect(DeltaSignSchema.safeParse(sign).success).toBe(true);
  });

  it.each(['rising', 'falling', 'positive', '', 'UP'])('rejects sign: %s', (sign) => {
    expect(DeltaSignSchema.safeParse(sign).success).toBe(false);
  });
});

// ─── DashboardKpiTileSchema.value (number | string) ─────────────────────────

describe('DashboardKpiTileSchema — value accepts number or string', () => {
  const base = { caption: 'Active Listings', delta: null, tone: 'neutral' as const };

  it('accepts integer value', () => {
    expect(DashboardKpiTileSchema.safeParse({ ...base, value: 42 }).success).toBe(true);
  });

  it('accepts BigInt-as-string value (money tile)', () => {
    expect(DashboardKpiTileSchema.safeParse({ ...base, value: '1500000' }).success).toBe(true);
  });

  it('rejects non-integer number value', () => {
    expect(DashboardKpiTileSchema.safeParse({ ...base, value: 4.5 }).success).toBe(false);
  });

  it('rejects nullish value', () => {
    expect(DashboardKpiTileSchema.safeParse({ ...base, value: null }).success).toBe(false);
  });

  it('only allows tone: neutral | warn', () => {
    expect(
      DashboardKpiTileSchema.safeParse({ ...base, value: 0, tone: 'danger' }).success,
    ).toBe(false);
  });
});

// ─── PipelineSnapshotSchema.stages length(10) ──────────────────────────────

describe('PipelineSnapshotSchema — stages must have length 10', () => {
  it('accepts exactly 10 stage entries', () => {
    const ok = PipelineSnapshotSchema.safeParse({
      stages: makePipelineStages(10),
      mostStuckStage: null,
    });
    expect(ok.success).toBe(true);
  });

  it('rejects fewer than 10 entries', () => {
    expect(
      PipelineSnapshotSchema.safeParse({
        stages: makePipelineStages(9),
        mostStuckStage: null,
      }).success,
    ).toBe(false);
  });

  it('rejects more than 10 entries', () => {
    expect(
      PipelineSnapshotSchema.safeParse({
        stages: [...makePipelineStages(10), { stage: 'acquired', count: 0 }],
        mostStuckStage: null,
      }).success,
    ).toBe(false);
  });

  it('rejects invalid stage names', () => {
    const bad = makePipelineStages(10);
    (bad[0] as unknown as { stage: string }).stage = 'not-a-stage';
    expect(
      PipelineSnapshotSchema.safeParse({ stages: bad, mostStuckStage: null }).success,
    ).toBe(false);
  });
});

// ─── DailyValueTileSchema.key enum coverage ────────────────────────────────

describe('DailyValueTileSchema — key enum', () => {
  const base = { label: 'X', value: null, sprintTag: 'Sprint 5' };

  it.each(['reservations', 'orders', 'financing_apps_open', 'tradein_valuations'])(
    'accepts key: %s',
    (key) => {
      expect(DailyValueTileSchema.safeParse({ ...base, key }).success).toBe(true);
    },
  );

  it.each(['leads', 'payments', 'returns', ''])('rejects key: %s', (key) => {
    expect(DailyValueTileSchema.safeParse({ ...base, key }).success).toBe(false);
  });

  it('accepts value: null and value: integer', () => {
    expect(
      DailyValueTileSchema.safeParse({ ...base, key: 'reservations', value: null }).success,
    ).toBe(true);
    expect(
      DailyValueTileSchema.safeParse({ ...base, key: 'reservations', value: 0 }).success,
    ).toBe(true);
  });
});

// ─── DashboardQuickActionSchema.key enum coverage ──────────────────────────

describe('DashboardQuickActionSchema — key enum', () => {
  const base = { label: 'X', href: '/x', variant: 'primary' as const };

  it.each(['new_vehicle', 'run_aging_now', 'create_user', 'view_audit_log'])(
    'accepts key: %s',
    (key) => {
      expect(DashboardQuickActionSchema.safeParse({ ...base, key }).success).toBe(true);
    },
  );

  it.each(['delete_user', 'open_dashboard', ''])('rejects key: %s', (key) => {
    expect(DashboardQuickActionSchema.safeParse({ ...base, key }).success).toBe(false);
  });

  it('only allows variant: primary | secondary', () => {
    expect(
      DashboardQuickActionSchema.safeParse({ ...base, key: 'new_vehicle', variant: 'danger' })
        .success,
    ).toBe(false);
  });
});

// ─── DashboardActivityEntrySchema.outcome enum ─────────────────────────────

describe('DashboardActivityEntrySchema — outcome is AuditLogOutcome enum', () => {
  const base = {
    id: '42',
    createdAt: '2026-05-16T10:00:00.000Z',
    actorName: 'Alice',
    actorEmail: 'a@b.com',
    action: 'listing.create',
    resource: 'admin.listing',
    resourceId: 'abc-123',
  };

  it.each(['success', 'denied', 'error'])('accepts outcome: %s', (outcome) => {
    expect(DashboardActivityEntrySchema.safeParse({ ...base, outcome }).success).toBe(true);
  });

  it.each(['ok', 'failed', 'pending', ''])('rejects outcome: %s', (outcome) => {
    expect(DashboardActivityEntrySchema.safeParse({ ...base, outcome }).success).toBe(false);
  });

  it('accepts null actorName and actorEmail (sign-in failure case)', () => {
    expect(
      DashboardActivityEntrySchema.safeParse({
        ...base,
        outcome: 'denied',
        actorName: null,
        actorEmail: null,
        resourceId: null,
      }).success,
    ).toBe(true);
  });
});
