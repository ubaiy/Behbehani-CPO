import type { Prisma } from '@prisma/client';
import type { ListingStage } from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

export type PricingTierRow = Prisma.PricingTierGetPayload<Record<string, never>>;

// ─── Tier queries ──────────────────────────────────────────────────────────

export async function listTiers(): Promise<PricingTierRow[]> {
  return prisma.pricingTier.findMany({
    where: { deletedAt: null },
    orderBy: [{ daysThresholdMin: 'asc' }, { name: 'asc' }],
  });
}

export async function findTierById(id: string): Promise<PricingTierRow | null> {
  return prisma.pricingTier.findFirst({ where: { id, deletedAt: null } });
}

export async function findTierByName(name: string): Promise<{ id: string } | null> {
  return prisma.pricingTier.findFirst({
    where: { name, deletedAt: null },
    select: { id: true },
  });
}

export async function createTier(data: {
  name: string;
  daysThresholdMin: number;
  discountBps: number;
  stagesAffected: string[];
  autoApply: boolean;
  updatedById: string;
}): Promise<PricingTierRow> {
  return prisma.pricingTier.create({
    data: {
      name: data.name,
      daysThresholdMin: data.daysThresholdMin,
      discountBps: data.discountBps,
      stagesAffected: data.stagesAffected,
      autoApply: data.autoApply,
      updatedById: data.updatedById,
    },
  });
}

export async function updateTier(
  id: string,
  data: {
    name?: string;
    daysThresholdMin?: number;
    discountBps?: number;
    stagesAffected?: string[];
    autoApply?: boolean;
    updatedById: string;
  },
): Promise<PricingTierRow> {
  return prisma.pricingTier.update({
    where: { id },
    data: {
      name: data.name,
      daysThresholdMin: data.daysThresholdMin,
      discountBps: data.discountBps,
      stagesAffected: data.stagesAffected !== undefined ? data.stagesAffected : undefined,
      autoApply: data.autoApply,
      updatedById: data.updatedById,
    },
  });
}

export async function softDeleteTier(id: string, actorId: string): Promise<void> {
  await prisma.pricingTier.update({
    where: { id },
    data: { deletedAt: new Date(), updatedById: actorId },
  });
}

// ─── Preview query ─────────────────────────────────────────────────────────

export type PreviewListingRow = {
  id: string;
  priceFils: bigint;
  listedAt: Date;
};

export async function findQualifyingListings(
  stagesAffected: ListingStage[],
  thresholdDate: Date,
): Promise<PreviewListingRow[]> {
  return prisma.listing.findMany({
    where: {
      deletedAt: null,
      agingDiscountEnabled: true,
      stage: { in: stagesAffected },
      listedAt: { lte: thresholdDate, not: null },
    },
    select: { id: true, priceFils: true, listedAt: true },
    orderBy: { listedAt: 'asc' },
  }) as Promise<PreviewListingRow[]>;
}

// ─── User lookup for updatedByName ─────────────────────────────────────────

export async function findUserFullName(id: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id }, select: { fullName: true } });
  return user?.fullName ?? null;
}
