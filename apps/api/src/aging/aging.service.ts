import { parseExpression } from 'cron-parser';
import type {
  AgingEngineStatusDto,
  AgingRunDto,
  AgingActiveDiscountListResponse,
  AgingDistribution,
} from '@behbehani-cpo/shared-types';
import { env } from '../config/env';
import { redisClient } from '../lib/redis';
import { runEngine } from './aging.engine';
import {
  getLastRun,
  listRuns,
  getStatusTotals,
  listActiveDiscounts,
  getDistribution,
  type ActiveDiscountFilter,
} from './aging.repo';

const PAUSED_KEY = 'aging-engine:paused';

// ─── Status ─────────────────────────────────────────────────────────────────

export async function getEngineStatus(): Promise<AgingEngineStatusDto> {
  const [redis, lastRun, totals] = await Promise.all([
    Promise.resolve(redisClient()),
    getLastRun(),
    getStatusTotals(),
  ]);

  const pausedVal = await redis.get(PAUSED_KEY);
  const paused = pausedVal === '1';

  // Compute nextScheduledAt from cron expression using cron-parser
  let nextScheduledAt: string | null = null;
  try {
    const interval = parseExpression(env.AGING_ENGINE_CRON, {
      tz: env.AGING_ENGINE_TZ,
    });
    nextScheduledAt = interval.next().toDate().toISOString();
  } catch {
    nextScheduledAt = null;
  }

  return {
    enabled: env.AGING_ENGINE_ENABLED,
    paused,
    nextScheduledAt,
    lastRun,
    totals: {
      activeListings: totals.activeListings,
      aging20to44: totals.aging20to44,
      aging45plus: totals.aging45plus,
      monthlyDiscountAppliedFils: totals.monthlyDiscountAppliedFils.toString(),
    },
  };
}

// ─── Runs list ───────────────────────────────────────────────────────────────

export async function getRuns(
  page: number,
  limit: number,
): Promise<{ items: AgingRunDto[]; total: number; page: number; pageSize: number }> {
  const { items, total } = await listRuns(page, limit);
  return { items, total, page, pageSize: limit };
}

// ─── Active discounts ────────────────────────────────────────────────────────

export async function getActiveDiscounts(
  filter: ActiveDiscountFilter,
): Promise<AgingActiveDiscountListResponse> {
  const { items, total } = await listActiveDiscounts(filter);
  return {
    items,
    total,
    page: filter.page,
    pageSize: filter.pageSize,
  };
}

// ─── Distribution ────────────────────────────────────────────────────────────

export async function getAgingDistribution(): Promise<AgingDistribution> {
  const buckets = await getDistribution();
  return { buckets };
}

// ─── Run now ─────────────────────────────────────────────────────────────────

export async function triggerRunNow(
  triggeredById: string,
  dryRun: boolean,
): Promise<AgingRunDto> {
  // Run the engine synchronously and return its result. We deliberately do NOT
  // also enqueue a BullMQ job: the worker is configured for scheduled nightly
  // runs and would (a) re-execute the engine creating a duplicate
  // AgingEngineRun row, and (b) ignore `dryRun` from job.data (older worker
  // behaviour) — actually applying real discounts on a dry-run request.
  // The synchronous AgingEngineRun row created inside runEngine() is enough
  // for the audit trail; the controller layer also calls recordAudit().
  return runEngine(triggeredById, dryRun);
}

// ─── Pause toggle ─────────────────────────────────────────────────────────────

export async function setPaused(paused: boolean): Promise<boolean> {
  const redis = redisClient();
  if (paused) {
    await redis.set(PAUSED_KEY, '1');
  } else {
    await redis.del(PAUSED_KEY);
  }
  return paused;
}
