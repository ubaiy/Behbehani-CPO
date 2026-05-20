/**
 * Offer repo — raw Prisma access for Offer. The service layer wraps these
 * with validation, DTO mapping, audit emission, and business guards.
 * Mirrors the pattern in inspections.repo.ts.
 */

import type { Prisma } from '@prisma/client';
import type { OfferListFilter } from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

// ─── Includes ─────────────────────────────────────────────────────────────────

const OFFER_INCLUDE = {
  customer: { select: { id: true, fullName: true, mobile: true, email: true } },
  createdBy: { select: { id: true, fullName: true } },
  inspection: {
    select: {
      id: true,
      bookingRef: true,
      vehicleYear: true,
      vehicleBrandName: true,
      vehicleModelName: true,
      vehicleVin: true,
      vehicleMileageKm: true,
      vehicleTransmission: true,
      customerDeclaredJson: true,
      listingId: true,
      customerId: true,
      // F3: join the listing so detail DTO can surface stockNumber post-acceptance.
      listing: { select: { id: true, stockNumber: true } },
    },
  },
} satisfies Prisma.OfferInclude;

export type OfferRow = Prisma.OfferGetPayload<{ include: typeof OFFER_INCLUDE }>;

// ─── Find helpers ─────────────────────────────────────────────────────────────

export function findOfferById(id: string): Promise<OfferRow | null> {
  return prisma.offer.findUnique({ where: { id }, include: OFFER_INCLUDE });
}

export function findOfferByPublicToken(token: string): Promise<OfferRow | null> {
  return prisma.offer.findUnique({ where: { publicToken: token }, include: OFFER_INCLUDE });
}

// ─── List with filters ────────────────────────────────────────────────────────

export async function listOffers(
  filter: OfferListFilter,
): Promise<{ rows: OfferRow[]; total: number }> {
  const where = buildWhere(filter);
  const skip = (filter.page - 1) * filter.limit;

  const [rows, total] = await prisma.$transaction([
    prisma.offer.findMany({
      where,
      include: OFFER_INCLUDE,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: filter.limit,
    }),
    prisma.offer.count({ where }),
  ]);
  return { rows, total };
}

function buildWhere(filter: OfferListFilter): Prisma.OfferWhereInput {
  const where: Prisma.OfferWhereInput = {};
  if (filter.status) where.status = filter.status;
  if (filter.customerId) where.customerId = filter.customerId;
  if (filter.inspectionId) where.inspectionId = filter.inspectionId;
  if (filter.minAgeDays !== undefined) {
    const cutoff = new Date(Date.now() - filter.minAgeDays * 24 * 60 * 60 * 1000);
    where.createdAt = { lte: cutoff };
  }
  if (filter.q && filter.q.length >= 2) {
    where.OR = [
      { bookingRef: { contains: filter.q, mode: 'insensitive' } },
      { customer: { fullName: { contains: filter.q, mode: 'insensitive' } } },
      { customer: { mobile: { contains: filter.q, mode: 'insensitive' } } },
    ];
  }
  return where;
}

// ─── Open-offer guard (T2) ────────────────────────────────────────────────────

/**
 * Returns the first non-terminal offer for the given inspection, or null if
 * none exists. Used by createOffer to prevent duplicate open-offer rows.
 * Non-terminal statuses: drafted, sent, countered_by_customer, countered_by_admin.
 */
export function findOpenOfferForInspection(inspectionId: string): Promise<OfferRow | null> {
  return prisma.offer.findFirst({
    where: {
      inspectionId,
      status: { in: ['drafted', 'sent', 'countered_by_customer', 'countered_by_admin'] },
    },
    include: OFFER_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Chain history ────────────────────────────────────────────────────────────

/**
 * Walk the `previousOfferId` chain to collect all ancestors (oldest first).
 * Used to build the offerHistory array in the detail DTO.
 */
export async function getOfferChain(offerId: string): Promise<OfferRow[]> {
  // Collect all offers for the same inspection; order by createdAt so the
  // timeline reads oldest → newest. This is simpler than recursive traversal
  // and covers the unlimited-round requirement (§16 D1).
  const anchor = await prisma.offer.findUnique({
    where: { id: offerId },
    select: { inspectionId: true },
  });
  if (!anchor) return [];

  return prisma.offer.findMany({
    where: { inspectionId: anchor.inspectionId },
    include: OFFER_INCLUDE,
    orderBy: [{ createdAt: 'asc' }],
  });
}

// ─── KPI — group-count by status ──────────────────────────────────────────────

export async function groupOfferCountByStatus(): Promise<{ status: string; count: number }[]> {
  const rows = await prisma.offer.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  return rows.map((r) => ({ status: r.status, count: r._count._all }));
}

// ─── Create / update ─────────────────────────────────────────────────────────

export function createOffer(
  data: Prisma.OfferUncheckedCreateInput,
): Promise<OfferRow> {
  return prisma.offer.create({ data, include: OFFER_INCLUDE });
}

export function updateOffer(
  id: string,
  data: Prisma.OfferUncheckedUpdateInput,
): Promise<OfferRow> {
  return prisma.offer.update({ where: { id }, data, include: OFFER_INCLUDE });
}
