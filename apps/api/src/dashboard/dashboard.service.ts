import type { AccessTokenPayload } from '../auth/jwt';
import type {
  DashboardKpisDto,
  DashboardActivityEntry,
  DashboardQuickAction,
  AdminRole,
  ListingStage,
} from '@behbehani-cpo/shared-types';
import { listAuditLogs } from '../audit-log/audit-log.repo';
import { getStatusTotals, getLastRun } from '../aging/aging.repo';
import { redisClient } from '../lib/redis';
import { env } from '../config/env';
import { parseExpression } from 'cron-parser';
import { deriveOutcome } from '../audit-log/audit-log.service';
import { prisma } from '../db/prisma';
import {
  getPipelineGroupBy,
  getMostStuckStage,
  getMediaCounts,
  getUserStatusCounts,
  getActivePricingTierCount,
  getActiveDiscountSummary,
  getPrevMonthDiscountFils,
  getFeaturedListingsCount,
} from './dashboard.repo';

// ─── Role helpers ─────────────────────────────────────────────────────────────

function hasAnyRole(user: AccessTokenPayload, ...roles: AdminRole[]): boolean {
  const adminRoles = user.adminRoles ?? [];
  if (adminRoles.includes('super_admin')) return true;
  return roles.some((r) => adminRoles.includes(r));
}

// ─── Quick actions definition ──────────────────────────────────────────────────

type QuickActionDef = {
  key: DashboardQuickAction['key'];
  label: string;
  href: string;
  variant: DashboardQuickAction['variant'];
  visibleTo: (user: AccessTokenPayload) => boolean;
};

const QUICK_ACTION_DEFS: QuickActionDef[] = [
  {
    key: 'new_vehicle',
    label: 'New Vehicle',
    href: '/inventory/listings/new',
    variant: 'primary',
    visibleTo: (u) =>
      hasAnyRole(u, 'operations_manager', 'sales_agent', 'content_editor', 'general_manager'),
  },
  {
    key: 'run_aging_now',
    label: 'Run Aging Now',
    href: '/reports/inventory-aging',
    variant: 'primary',
    visibleTo: (u) => hasAnyRole(u, 'finance_officer', 'pricing_manager'),
  },
  {
    key: 'create_user',
    label: 'Create User',
    href: '/admin/users',
    variant: 'secondary',
    // super_admin only — hasAnyRole handles the super_admin bypass above, but
    // this action must NOT be visible to other roles even though they pass bypass.
    // We special-case: only super_admin sees this.
    visibleTo: (u) => (u.adminRoles ?? []).includes('super_admin'),
  },
  {
    key: 'view_audit_log',
    label: 'View Audit Log',
    href: '/admin/audit-log',
    variant: 'secondary',
    visibleTo: (u) => hasAnyRole(u, 'general_manager'),
  },
];

// ─── Aging paused check ───────────────────────────────────────────────────────

const PAUSED_KEY = 'aging-engine:paused';

async function getAgingPaused(): Promise<boolean> {
  const redis = redisClient();
  const val = await redis.get(PAUSED_KEY);
  return val === '1';
}

// ─── KPI delta util ───────────────────────────────────────────────────────────
// TODO: wire up historical snapshots (DashboardSnapshot table) in a future
// sprint — until then, all KPI deltas are null except monthlyDiscountAppliedFils
// which compares against the previous calendar month.

function computeDiscountDelta(
  current: bigint,
  prev: bigint,
): import('@behbehani-cpo/shared-types').Delta | null {
  if (prev === BigInt(0)) return null;
  const diff = Number(current) - Number(prev);
  const pct = Math.round((diff / Number(prev)) * 10000) / 100; // 2 d.p.
  return {
    sign: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
    pct: Math.abs(pct),
    vsPeriod: 'last month',
  };
}

// ─── Main orchestration ───────────────────────────────────────────────────────

async function resolveFirstName(userId: string): Promise<string> {
  // User.id is the @id PK — findUnique is the correct call (same query plan,
  // but explicit + type-safe). Reviewer C1.
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });
  return (row?.fullName ?? '').split(' ')[0] || 'Admin';
}

export async function getDashboardKpis(user: AccessTokenPayload): Promise<DashboardKpisDto> {
  const generatedAt = new Date().toISOString();

  const agingVisible = hasAnyRole(
    user,
    'general_manager',
    'operations_manager',
    'finance_officer',
    'pricing_manager',
  );
  const usersVisible = hasAnyRole(user, 'general_manager');
  // Recent activity surfaces audit log entries — should match the audit-log
  // controller's READ access (super_admin + general_manager only). Otherwise
  // dashboard would leak `aging.pause`, `user.lock`, etc. to roles that can't
  // open the audit log page itself. Reviewer N12.
  const recentActivityVisible = hasAnyRole(user, 'general_manager');

  // ── Parallel data fetch ───────────────────────────────────────────────────
  const [
    greetingName,
    agingTotals,
    lastRun,
    agingPaused,
    pipeline,
    mostStuckStage,
    mediaCounts,
    pricingTierCount,
    activeDiscountSummary,
    prevMonthDiscount,
    auditResult,
    userCounts,
    featuredListingsCount,
  ] = await Promise.all([
    resolveFirstName(user.sub),
    getStatusTotals(),
    getLastRun(),
    getAgingPaused(),
    getPipelineGroupBy(),
    getMostStuckStage(),
    getMediaCounts(),
    getActivePricingTierCount(),
    getActiveDiscountSummary(),
    getPrevMonthDiscountFils(),
    recentActivityVisible
      ? listAuditLogs({ page: 1, pageSize: 10, sort: 'newest' })
      : Promise.resolve({ rows: [], total: 0, filteredFrom: 0 }),
    usersVisible ? getUserStatusCounts() : Promise.resolve(null),
    getFeaturedListingsCount(),
  ]);

  // ── Next scheduled at (same logic as aging.service) ───────────────────────
  let nextScheduledAt: string | null = null;
  try {
    const interval = parseExpression(env.AGING_ENGINE_CRON, { tz: env.AGING_ENGINE_TZ });
    nextScheduledAt = interval.next().toDate().toISOString();
  } catch {
    nextScheduledAt = null;
  }

  // ── Discount delta ────────────────────────────────────────────────────────
  const currentMonthDiscount = agingTotals.monthlyDiscountAppliedFils;
  const discountDelta = computeDiscountDelta(currentMonthDiscount, prevMonthDiscount);

  // ── Recent activity mapping ───────────────────────────────────────────────
  const recentActivity: DashboardActivityEntry[] = auditResult.rows.map((r) => ({
    id: r.id.toString(),
    createdAt: r.createdAt.toISOString(),
    actorName: r.actor?.fullName ?? null,
    actorEmail: r.actor?.email ?? null,
    action: r.action,
    resource: r.resource,
    resourceId: r.resourceId ?? null,
    outcome: deriveOutcome(r.action),
  }));

  // ── Quick actions ─────────────────────────────────────────────────────────
  const quickActions: DashboardQuickAction[] = QUICK_ACTION_DEFS.filter((def) =>
    def.visibleTo(user),
  ).map(({ key, label, href, variant }) => ({ key, label, href, variant }));

  // ── Aging engine block (role-gated) ───────────────────────────────────────
  const agingEngine = agingVisible
    ? {
        enabled: env.AGING_ENGINE_ENABLED,
        paused: agingPaused,
        lastRun: lastRun
          ? {
              finishedAt: lastRun.finishedAt ?? generatedAt,
              status: lastRun.status,
              processedCount: lastRun.processedCount,
              appliedCount: lastRun.appliedCount,
            }
          : null,
        nextScheduledAt,
        activeDiscounts: {
          listingCount: activeDiscountSummary.listingCount,
          totalReductionFils: activeDiscountSummary.totalReductionFils.toString(),
        },
      }
    : null;

  return {
    greetingName,
    generatedAt,

    topKpis: {
      activeListings: {
        value: agingTotals.activeListings,
        caption: 'Active Listings',
        delta: null, // TODO: wire DashboardSnapshot table in future sprint
        tone: 'neutral',
      },
      featuredListings: {
        value: featuredListingsCount,
        caption: 'Featured Listings',
        delta: null,
        tone: 'neutral',
      },
      aging20to44: {
        value: agingTotals.aging20to44,
        caption: 'Aging 20–44 d',
        delta: null, // TODO: wire DashboardSnapshot table in future sprint
        tone: 'neutral',
      },
      aging45plus: {
        value: agingTotals.aging45plus,
        caption: 'Aging 45+ d',
        delta: null, // TODO: wire DashboardSnapshot table in future sprint
        tone: 'warn',
      },
      monthlyDiscountAppliedFils: {
        value: currentMonthDiscount.toString(),
        caption: 'Discounts Applied (MTD)',
        delta: discountDelta,
        tone: 'neutral',
      },
    },

    dailyValues: [
      { key: 'reservations', label: 'Reservations Today', value: null, sprintTag: 'Sprint 5' },
      { key: 'orders', label: 'Orders Today', value: null, sprintTag: 'Sprint 6' },
      { key: 'financing_apps_open', label: 'Open Financing Apps', value: null, sprintTag: 'Sprint 7' },
      { key: 'tradein_valuations', label: 'Trade-In Valuations Today', value: null, sprintTag: 'Sprint 9' },
    ],

    pipeline: {
      stages: pipeline,
      mostStuckStage,
    },

    agingEngine,

    systemHealth: {
      media: mediaCounts,
      users: userCounts,
      pricingTiers: { active: pricingTierCount },
    },

    recentActivity,
    quickActions,
  };
}
