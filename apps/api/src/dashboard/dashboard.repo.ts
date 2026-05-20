import { ListingStage } from '@prisma/client';
import { LISTING_STAGES } from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';
import type { PipelineStageCount, ListingStage as ListingStageDto } from '@behbehani-cpo/shared-types';

const DAY_MS = 1000 * 60 * 60 * 24;

// Stages that contribute to "stuck" detection — active pre-sale workflow stages.
const STUCK_STAGES: ListingStage[] = [
  ListingStage.inspection,
  ListingStage.photoshoot,
  ListingStage.reconditioning,
];

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export async function getPipelineGroupBy(): Promise<PipelineStageCount[]> {
  const rows = await prisma.listing.groupBy({
    by: ['stage'],
    _count: true,
    where: { deletedAt: null },
  });

  const countMap = new Map<string, number>(rows.map((r) => [r.stage, r._count]));

  // Return exactly 10 entries in enum declaration order with 0 fill.
  return LISTING_STAGES.map((stage) => ({
    stage,
    count: countMap.get(stage) ?? 0,
  }));
}

// ─── Most stuck stage ────────────────────────────────────────────────────────
// Threshold: avg age ≥ 14 days in a pre-sale stage is considered "stuck".
// We query a slim projection of active listings in the stuck stages and
// compute avg in-process — avoids any Prisma raw-SQL avg() incompatibilities.

const STUCK_THRESHOLD_DAYS = 14;

export async function getMostStuckStage(): Promise<{
  stage: ListingStageDto;
  avgDays: number;
} | null> {
  const rows = await prisma.listing.findMany({
    where: {
      deletedAt: null,
      stage: { in: STUCK_STAGES },
    },
    select: { stage: true, createdAt: true },
  });

  if (rows.length === 0) return null;

  const now = Date.now();
  // Accumulate sum and count per stage.
  const accum = new Map<string, { sumDays: number; count: number }>();
  for (const r of rows) {
    const days = (now - r.createdAt.getTime()) / DAY_MS;
    const entry = accum.get(r.stage) ?? { sumDays: 0, count: 0 };
    entry.sumDays += days;
    entry.count += 1;
    accum.set(r.stage, entry);
  }

  let maxAvg = 0;
  let maxStage: string | null = null;
  for (const [stage, { sumDays, count }] of accum) {
    const avg = sumDays / count;
    if (avg > maxAvg) {
      maxAvg = avg;
      maxStage = stage;
    }
  }

  if (maxStage === null || maxAvg < STUCK_THRESHOLD_DAYS) return null;

  return { stage: maxStage as ListingStageDto, avgDays: Math.round(maxAvg) };
}

// ─── Media counts ─────────────────────────────────────────────────────────────

export async function getMediaCounts(): Promise<{
  photos: number;
  media360: number;
  videos: number;
}> {
  const [photos, media360, videos] = await prisma.$transaction([
    prisma.listingPhoto.count({ where: { uploadStatus: 'complete' } }),
    prisma.listing360.count({ where: { uploadStatus: 'complete' } }),
    prisma.listingVideo.count({ where: { uploadStatus: 'complete' } }),
  ]);
  return { photos, media360, videos };
}

// ─── User counts ──────────────────────────────────────────────────────────────

export async function getUserStatusCounts(): Promise<{
  active: number;
  locked: number;
  disabled: number;
}> {
  const now = new Date();
  const [active, locked, disabled] = await prisma.$transaction([
    prisma.user.count({
      where: { deletedAt: null, lockedUntil: { lte: now } },
    }),
    prisma.user.count({
      where: { deletedAt: null, lockedUntil: { gt: now } },
    }),
    prisma.user.count({
      where: { NOT: { deletedAt: null } },
    }),
  ]);
  return { active, locked, disabled };
}

// ─── Pricing tier count ───────────────────────────────────────────────────────

export async function getActivePricingTierCount(): Promise<number> {
  return prisma.pricingTier.count({ where: { deletedAt: null } });
}

// ─── Featured listing count ──────────────────────────────────────────────────
// Active (non-archived) listings with the operator-curated `featuredAt` set.

export async function getFeaturedListingsCount(): Promise<number> {
  return prisma.listing.count({
    where: { deletedAt: null, featuredAt: { not: null } },
  });
}

// ─── Active discount aggregate ────────────────────────────────────────────────
// Returns the number of distinct listings with an unreversed applied discount
// and the total reduction fils.

export async function getActiveDiscountSummary(): Promise<{
  listingCount: number;
  totalReductionFils: bigint;
}> {
  const [listingCount, agg] = await prisma.$transaction([
    prisma.appliedDiscount.findMany({
      where: { revertedAt: null },
      select: { listingId: true },
      distinct: ['listingId'],
    }),
    prisma.appliedDiscount.aggregate({
      _sum: { fromFils: true, toFils: true },
      where: { revertedAt: null },
    }),
  ]);

  const fromSum = agg._sum.fromFils ?? BigInt(0);
  const toSum = agg._sum.toFils ?? BigInt(0);
  const diff = fromSum - toSum;
  const totalReductionFils = diff < BigInt(0) ? BigInt(0) : diff;

  return { listingCount: listingCount.length, totalReductionFils };
}

// ─── Previous-month discount total (for delta computation) ───────────────────

export async function getPrevMonthDiscountFils(): Promise<bigint> {
  const now = new Date();
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prevMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const agg = await prisma.appliedDiscount.aggregate({
    _sum: { fromFils: true, toFils: true },
    where: {
      revertedAt: null,
      appliedAt: { gte: prevMonthStart, lt: prevMonthEnd },
    },
  });

  const fromSum = agg._sum.fromFils ?? BigInt(0);
  const toSum = agg._sum.toFils ?? BigInt(0);
  const diff = fromSum - toSum;
  return diff < BigInt(0) ? BigInt(0) : diff;
}
