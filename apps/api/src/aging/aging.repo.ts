import type { Prisma } from '@prisma/client';
import { AgingRunStatus, ListingStage } from '@prisma/client';
import { maskVin } from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';
import type {
  AgingRunDto,
  AppliedDiscountDto,
  AgingDistributionBucket,
} from '@behbehani-cpo/shared-types';

const EXCLUDED_STAGES: ListingStage[] = [ListingStage.sold, ListingStage.delivered, ListingStage.closed];
const DAY_MS = 1000 * 60 * 60 * 24;

// ─── Run DTO mapping ────────────────────────────────────────────────────────

type RunRow = Prisma.AgingEngineRunGetPayload<{
  include: { triggeredBy: { select: { fullName: true } } };
}>;

export function runRowToDto(run: RunRow): AgingRunDto {
  return {
    id: run.id,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    status: run.status as AgingRunDto['status'],
    processedCount: run.processedCount,
    appliedCount: run.appliedCount,
    totalReductionFils: run.totalReductionFils.toString(),
    errorMessage: run.errorMessage,
    triggeredByName: run.triggeredBy ? run.triggeredBy.fullName : null,
  };
}

export async function getLastRun(): Promise<AgingRunDto | null> {
  const run = await prisma.agingEngineRun.findFirst({
    where: { status: { not: AgingRunStatus.running } },
    orderBy: { startedAt: 'desc' },
    include: { triggeredBy: { select: { fullName: true } } },
  });
  return run ? runRowToDto(run) : null;
}

export async function listRuns(
  page: number,
  limit: number,
): Promise<{ items: AgingRunDto[]; total: number }> {
  const skip = (page - 1) * limit;
  const [rows, total] = await prisma.$transaction([
    prisma.agingEngineRun.findMany({
      orderBy: { startedAt: 'desc' },
      skip,
      take: limit,
      include: { triggeredBy: { select: { fullName: true } } },
    }),
    prisma.agingEngineRun.count(),
  ]);
  return { items: rows.map(runRowToDto), total };
}

// ─── Status totals ──────────────────────────────────────────────────────────

export async function getStatusTotals(): Promise<{
  activeListings: number;
  aging20to44: number;
  aging45plus: number;
  monthlyDiscountAppliedFils: bigint;
}> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [activeListings, allActive, monthlyAgg] = await prisma.$transaction([
    prisma.listing.count({
      where: { deletedAt: null, stage: { notIn: EXCLUDED_STAGES } },
    }),
    prisma.listing.findMany({
      where: {
        deletedAt: null,
        stage: { notIn: EXCLUDED_STAGES },
        listedAt: { not: null },
      },
      select: { listedAt: true },
    }),
    prisma.appliedDiscount.aggregate({
      _sum: { fromFils: true, toFils: true },
      where: {
        revertedAt: null,
        appliedAt: { gte: monthStart },
      },
    }),
  ]);

  let aging20to44 = 0;
  let aging45plus = 0;
  for (const l of allActive) {
    const days = Math.floor((now.getTime() - l.listedAt!.getTime()) / DAY_MS);
    if (days >= 20 && days <= 44) aging20to44++;
    else if (days >= 45) aging45plus++;
  }

  const fromSum = monthlyAgg._sum.fromFils ?? BigInt(0);
  const toSum = monthlyAgg._sum.toFils ?? BigInt(0);
  const monthlyDiscountAppliedFils = fromSum - toSum < BigInt(0)
    ? BigInt(0)
    : fromSum - toSum;

  return { activeListings, aging20to44, aging45plus, monthlyDiscountAppliedFils };
}

// ─── Active discounts ───────────────────────────────────────────────────────

export interface ActiveDiscountFilter {
  page: number;
  pageSize: number;
  stage?: string;
  tierId?: string;
  brandId?: string;
  daysMin?: number;
  daysMax?: number;
  q?: string;
}

export async function listActiveDiscounts(filter: ActiveDiscountFilter): Promise<{
  items: AppliedDiscountDto[];
  total: number;
}> {
  const listingWhere: Prisma.ListingWhereInput = { deletedAt: null };
  if (filter.stage) listingWhere.stage = filter.stage as ListingStage;
  if (filter.brandId) listingWhere.brandId = filter.brandId;

  // Push days-on-lot bounds into SQL via listedAt cutoffs so total + pagination
  // stay consistent. daysMin -> listedAt <= (now - daysMin*DAY); daysMax ->
  // listedAt >= (now - daysMax*DAY). Listings without listedAt are excluded
  // when either bound is set (we can't compute their days-on-lot).
  const now = Date.now();
  if (filter.daysMin !== undefined || filter.daysMax !== undefined) {
    const listedAt: Prisma.DateTimeNullableFilter = {};
    if (filter.daysMin !== undefined) {
      listedAt.lte = new Date(now - filter.daysMin * DAY_MS);
    }
    if (filter.daysMax !== undefined) {
      listedAt.gte = new Date(now - filter.daysMax * DAY_MS);
    }
    listingWhere.listedAt = listedAt;
  }

  if (filter.q) {
    // Require at least 3 chars to avoid full-table substring scans and to
    // prevent VIN fingerprinting via 1–2 char probes. VIN search uses startsWith
    // anchored to the last-6 segment (the part shown in the UI) instead of an
    // unbounded substring; a dedicated full-VIN lookup endpoint can land later.
    if (filter.q.length >= 3) {
      const q = filter.q;
      listingWhere.OR = [
        { titleEn: { contains: q, mode: 'insensitive' } },
        { stockNumber: { contains: q, mode: 'insensitive' } },
        { vin: { endsWith: q, mode: 'insensitive' } },
      ];
    }
  }

  const where: Prisma.AppliedDiscountWhereInput = {
    revertedAt: null,
    listing: listingWhere,
  };
  if (filter.tierId) where.tierId = filter.tierId;

  const skip = (filter.page - 1) * filter.pageSize;

  const [rows, total] = await prisma.$transaction([
    prisma.appliedDiscount.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
      skip,
      take: filter.pageSize,
      include: {
        listing: {
          select: {
            stockNumber: true,
            titleEn: true,
            vin: true,
            stage: true,
            listedAt: true,
            brand: { select: { id: true } },
          },
        },
        tier: { select: { name: true } },
      },
    }),
    prisma.appliedDiscount.count({ where }),
  ]);

  const items: AppliedDiscountDto[] = rows
    .map((r) => {
      const days = r.listing.listedAt
        ? Math.floor((now - r.listing.listedAt.getTime()) / DAY_MS)
        : 0;
      return {
        id: r.id.toString(),
        listingId: r.listingId,
        listingStockNumber: r.listing.stockNumber,
        listingTitle: r.listing.titleEn,
        vinMasked: maskVin(r.listing.vin),
        stage: r.listing.stage as AppliedDiscountDto['stage'],
        daysOnLot: days,
        tierId: r.tierId,
        tierName: r.tier.name,
        discountBps: r.discountBps,
        fromFils: r.fromFils.toString(),
        toFils: r.toFils.toString(),
        appliedAt: r.appliedAt.toISOString(),
        revertedAt: r.revertedAt ? r.revertedAt.toISOString() : null,
      };
    });

  return { items, total };
}

// ─── Distribution ───────────────────────────────────────────────────────────

const BUCKETS: Array<{ label: string; daysFrom: number; daysToInclusive: number | null }> = [
  { label: '0-7',   daysFrom: 0,   daysToInclusive: 7 },
  { label: '8-19',  daysFrom: 8,   daysToInclusive: 19 },
  { label: '20-29', daysFrom: 20,  daysToInclusive: 29 },
  { label: '30-44', daysFrom: 30,  daysToInclusive: 44 },
  { label: '45-59', daysFrom: 45,  daysToInclusive: 59 },
  { label: '60-89', daysFrom: 60,  daysToInclusive: 89 },
  { label: '90-119',daysFrom: 90,  daysToInclusive: 119 },
  { label: '120+',  daysFrom: 120, daysToInclusive: null },
];

export async function getDistribution(): Promise<AgingDistributionBucket[]> {
  const listings = await prisma.listing.findMany({
    where: {
      deletedAt: null,
      stage: { notIn: EXCLUDED_STAGES },
      listedAt: { not: null },
    },
    select: { listedAt: true },
  });

  const now = Date.now();
  const counts = new Array<number>(BUCKETS.length).fill(0);

  for (const l of listings) {
    const days = Math.floor((now - l.listedAt!.getTime()) / DAY_MS);
    for (let i = BUCKETS.length - 1; i >= 0; i--) {
      if (days >= BUCKETS[i].daysFrom) {
        counts[i]++;
        break;
      }
    }
  }

  return BUCKETS.map((b, i) => ({
    label: b.label,
    daysFrom: b.daysFrom,
    daysToInclusive: b.daysToInclusive,
    count: counts[i],
  }));
}
