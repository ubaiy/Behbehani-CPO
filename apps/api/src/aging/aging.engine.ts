import type { AgingRunDto } from '@behbehani-cpo/shared-types';
import { AgingRunStatus, ListingStage } from '@prisma/client';
import { prisma } from '../db/prisma';
import { redisClient } from '../lib/redis';

const PAUSED_KEY = 'aging-engine:paused';
const EXCLUDED_STAGES: ListingStage[] = [ListingStage.sold, ListingStage.delivered, ListingStage.closed];
const DAY_MS = 1000 * 60 * 60 * 24;

function daysOnLot(listedAt: Date): number {
  return Math.floor((Date.now() - listedAt.getTime()) / DAY_MS);
}

function toRunDto(run: {
  id: string;
  startedAt: Date;
  finishedAt: Date | null;
  status: string;
  processedCount: number;
  appliedCount: number;
  totalReductionFils: bigint;
  errorMessage: string | null;
  triggeredBy: { fullName: string } | null;
}): AgingRunDto {
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

export async function runEngine(
  triggeredById: string | null,
  dryRun = false,
): Promise<AgingRunDto> {
  const redis = redisClient();

  // Check paused state
  const pausedVal = await redis.get(PAUSED_KEY);
  const isPaused = pausedVal === '1';

  // Create the run record
  const run = await prisma.agingEngineRun.create({
    data: {
      status: AgingRunStatus.running,
      triggeredById,
    },
    include: { triggeredBy: { select: { fullName: true } } },
  });

  if (isPaused) {
    const updated = await prisma.agingEngineRun.update({
      where: { id: run.id },
      data: {
        status: AgingRunStatus.skipped,
        errorMessage: 'paused by admin',
        finishedAt: new Date(),
      },
      include: { triggeredBy: { select: { fullName: true } } },
    });
    return toRunDto(updated);
  }

  if (dryRun) {
    // Dry run: simulate the engine inside a transaction that is always rolled back.
    // Price changes and discount rows are written then discarded; only the run row
    // (created outside the transaction) is updated to status=skipped.
    try {
      await prisma.$transaction(async (tx) => {
        const listings = await tx.listing.findMany({
          where: {
            deletedAt: null,
            stage: { notIn: EXCLUDED_STAGES },
            agingDiscountEnabled: true,
            listedAt: { not: null },
          },
          select: {
            id: true,
            priceFils: true,
            stage: true,
            listedAt: true,
            appliedDiscounts: {
              where: { revertedAt: null },
              orderBy: { appliedAt: 'desc' },
              take: 1,
              select: { tierId: true },
            },
          },
        });

        const tiers = await tx.pricingTier.findMany({
          where: { deletedAt: null, autoApply: true },
          orderBy: [{ daysThresholdMin: 'desc' }, { updatedAt: 'desc' }],
        });

        for (const listing of listings) {
          const days = daysOnLot(listing.listedAt!);
          const qualifyingTiers = tiers.filter((t) => {
            const stages = t.stagesAffected as string[];
            return t.daysThresholdMin <= days && stages.includes(listing.stage);
          });
          if (qualifyingTiers.length === 0) continue;

          const bestTier = qualifyingTiers.reduce((best, t) => {
            if (t.discountBps < best.discountBps) return t;
            if (t.discountBps === best.discountBps) {
              if (t.daysThresholdMin > best.daysThresholdMin) return t;
              if (t.daysThresholdMin === best.daysThresholdMin) {
                return t.updatedAt > best.updatedAt ? t : best;
              }
            }
            return best;
          });

          const lastDiscount = listing.appliedDiscounts[0];
          if (lastDiscount && lastDiscount.tierId === bestTier.id) continue;

          const discountFils =
            (listing.priceFils * BigInt(Math.abs(bestTier.discountBps))) / BigInt(10000);
          const newPriceFils = listing.priceFils - discountFils;
          if (newPriceFils <= BigInt(0)) continue;

          // Write changes inside the transaction — they will be rolled back
          await tx.listing.update({ where: { id: listing.id }, data: { priceFils: newPriceFils } });
          await tx.appliedDiscount.create({
            data: {
              listingId: listing.id,
              tierId: bestTier.id,
              runId: run.id,
              fromFils: listing.priceFils,
              toFils: newPriceFils,
              discountBps: bestTier.discountBps,
              appliedAt: new Date(),
            },
          });
          await tx.priceHistory.create({
            data: {
              listingId: listing.id,
              fromFils: listing.priceFils,
              toFils: newPriceFils,
              reason: `aging-engine:tier:${bestTier.name}`,
              changedById: null,
            },
          });
        }
        // Intentional rollback
        throw new DryRunAbort();
      });
    } catch (err) {
      if (!(err instanceof DryRunAbort)) {
        // Unexpected error during dry run — still mark skipped
        console.error('[aging-engine] dry-run transaction error', err);
      }
    }

    const updated = await prisma.agingEngineRun.update({
      where: { id: run.id },
      data: {
        status: AgingRunStatus.skipped,
        errorMessage: 'dry-run',
        finishedAt: new Date(),
      },
      include: { triggeredBy: { select: { fullName: true } } },
    });
    return toRunDto(updated);
  }

  // Real run
  let processedCount = 0;
  let appliedCount = 0;
  let totalReductionFils = BigInt(0);
  let errorMessage: string | null = null;

  try {
    const listings = await prisma.listing.findMany({
      where: {
        deletedAt: null,
        stage: { notIn: EXCLUDED_STAGES },
        agingDiscountEnabled: true,
        listedAt: { not: null },
      },
      select: {
        id: true,
        priceFils: true,
        stage: true,
        listedAt: true,
        appliedDiscounts: {
          where: { revertedAt: null },
          orderBy: { appliedAt: 'desc' },
          take: 1,
          select: { tierId: true },
        },
      },
    });

    const tiers = await prisma.pricingTier.findMany({
      where: { deletedAt: null, autoApply: true },
      orderBy: [{ daysThresholdMin: 'desc' }, { updatedAt: 'desc' }],
    });

    for (const listing of listings) {
      processedCount++;

      const days = daysOnLot(listing.listedAt!);
      const qualifyingTiers = tiers.filter((t) => {
        const stages = t.stagesAffected as string[];
        return t.daysThresholdMin <= days && stages.includes(listing.stage);
      });

      if (qualifyingTiers.length === 0) continue;

      // Pick highest-discount tier (most negative discountBps → smallest numeric value)
      const bestTier = qualifyingTiers.reduce((best, t) => {
        if (t.discountBps < best.discountBps) return t;
        if (t.discountBps === best.discountBps) {
          // tiebreaker: largest daysThresholdMin, then most recently updated
          if (t.daysThresholdMin > best.daysThresholdMin) return t;
          if (t.daysThresholdMin === best.daysThresholdMin) {
            return t.updatedAt > best.updatedAt ? t : best;
          }
        }
        return best;
      });

      // Idempotency: skip if same tier is already the most recent non-reverted discount
      const lastDiscount = listing.appliedDiscounts[0];
      if (lastDiscount && lastDiscount.tierId === bestTier.id) continue;

      const discountFils =
        (listing.priceFils * BigInt(Math.abs(bestTier.discountBps))) / BigInt(10000);
      const newPriceFils = listing.priceFils - discountFils;

      if (newPriceFils <= BigInt(0)) {
        console.warn(`[aging-engine] listing ${listing.id} would reach zero price, skipping`);
        continue;
      }

      try {
        await prisma.$transaction(async (tx) => {
          await tx.listing.update({
            where: { id: listing.id },
            data: { priceFils: newPriceFils },
          });
          await tx.appliedDiscount.create({
            data: {
              listingId: listing.id,
              tierId: bestTier.id,
              runId: run.id,
              fromFils: listing.priceFils,
              toFils: newPriceFils,
              discountBps: bestTier.discountBps,
              appliedAt: new Date(),
            },
          });
          await tx.priceHistory.create({
            data: {
              listingId: listing.id,
              fromFils: listing.priceFils,
              toFils: newPriceFils,
              reason: `aging-engine:tier:${bestTier.name}`,
              changedById: null,
            },
          });
        });
        appliedCount++;
        totalReductionFils += discountFils;
      } catch (txErr) {
        console.error(`[aging-engine] transaction failed for listing ${listing.id}`, txErr);
      }
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[aging-engine] run failed', err);
  }

  const finalStatus = errorMessage ? AgingRunStatus.error : AgingRunStatus.success;
  const updated = await prisma.agingEngineRun.update({
    where: { id: run.id },
    data: {
      status: finalStatus,
      processedCount,
      appliedCount,
      totalReductionFils,
      errorMessage,
      finishedAt: new Date(),
    },
    include: { triggeredBy: { select: { fullName: true } } },
  });

  return toRunDto(updated);
}

class DryRunAbort extends Error {
  constructor() {
    super('dry-run-abort');
  }
}
