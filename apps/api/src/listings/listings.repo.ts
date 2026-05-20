import type { Prisma } from '@prisma/client';
import type { ListingFilter } from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

const SUMMARY_INCLUDE = {
  brand: { select: { id: true, nameEn: true, nameAr: true } },
  model: { select: { id: true, nameEn: true, nameAr: true } },
  trim: { select: { id: true, name: true } },
  bodyType: { select: { id: true, nameEn: true, nameAr: true } },
  assignedSales: { select: { id: true, fullName: true } },
  photos: {
    where: { isHero: true },
    take: 1,
    select: { id: true, cdnUrl: true },
  },
} satisfies Prisma.ListingInclude;

const DETAIL_INCLUDE = {
  brand: { select: { id: true, nameEn: true, nameAr: true } },
  model: { select: { id: true, nameEn: true, nameAr: true } },
  trim: { select: { id: true, name: true } },
  bodyType: { select: { id: true, nameEn: true, nameAr: true } },
  assignedSales: { select: { id: true, fullName: true } },
  photos: {
    orderBy: { sortOrder: 'asc' },
    select: { id: true, cdnUrl: true, altEn: true, altAr: true, isHero: true, sortOrder: true },
  },
  videos: { select: { id: true, cdnUrl: true, durationS: true } },
  priceHistory: {
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { changedBy: { select: { id: true, fullName: true } } },
  },
  inspectionReport: {
    select: { id: true, overallScore: true, reportPdfKey: true, inspectedAt: true },
  },
} satisfies Prisma.ListingInclude;

export type ListingSummaryRow = Prisma.ListingGetPayload<{ include: typeof SUMMARY_INCLUDE }>;
export type ListingDetailRow = Prisma.ListingGetPayload<{ include: typeof DETAIL_INCLUDE }>;

function buildWhere(filter: ListingFilter): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { deletedAt: null };
  if (filter.q) {
    where.OR = [
      { titleEn: { contains: filter.q, mode: 'insensitive' } },
      { vin: { contains: filter.q, mode: 'insensitive' } },
      { stockNumber: { contains: filter.q, mode: 'insensitive' } },
    ];
  }
  if (filter.brandId) where.brandId = filter.brandId;
  if (filter.modelId) where.modelId = filter.modelId;
  if (filter.bodyTypeId) where.bodyTypeId = filter.bodyTypeId;
  if (filter.stage) where.stage = filter.stage;
  if (filter.assignedSalesId) where.assignedSalesId = filter.assignedSalesId;
  if (filter.featured !== undefined) {
    where.featuredAt = filter.featured ? { not: null } : null;
  }
  if (filter.minPriceFils !== undefined || filter.maxPriceFils !== undefined) {
    where.priceFils = {};
    if (filter.minPriceFils !== undefined) where.priceFils.gte = BigInt(filter.minPriceFils);
    if (filter.maxPriceFils !== undefined) where.priceFils.lte = BigInt(filter.maxPriceFils);
  }
  if (filter.minYear !== undefined || filter.maxYear !== undefined) {
    where.year = {};
    if (filter.minYear !== undefined) where.year.gte = filter.minYear;
    if (filter.maxYear !== undefined) where.year.lte = filter.maxYear;
  }
  return where;
}

function buildOrderBy(sort: ListingFilter['sort']): Prisma.ListingOrderByWithRelationInput {
  switch (sort) {
    case 'createdAt:asc':
      return { createdAt: 'asc' };
    case 'price:asc':
      return { priceFils: 'asc' };
    case 'price:desc':
      return { priceFils: 'desc' };
    case 'mileage:asc':
      return { mileageKm: 'asc' };
    case 'createdAt:desc':
    default:
      return { createdAt: 'desc' };
  }
}

export async function listListings(filter: ListingFilter): Promise<{ rows: ListingSummaryRow[]; total: number }> {
  const where = buildWhere(filter);
  const [rows, total] = await prisma.$transaction([
    prisma.listing.findMany({
      where,
      include: SUMMARY_INCLUDE,
      orderBy: buildOrderBy(filter.sort),
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
    prisma.listing.count({ where }),
  ]);
  return { rows, total };
}

export async function findListingById(id: string): Promise<ListingDetailRow | null> {
  return prisma.listing.findFirst({
    where: { id, deletedAt: null },
    include: DETAIL_INCLUDE,
  });
}

export async function findListingByVin(vin: string): Promise<{ id: string } | null> {
  return prisma.listing.findFirst({
    where: { vin, deletedAt: null },
    select: { id: true },
  });
}

export async function createListing(data: Prisma.ListingUncheckedCreateInput): Promise<ListingDetailRow> {
  return prisma.listing.create({ data, include: DETAIL_INCLUDE });
}

export async function updateListing(id: string, data: Prisma.ListingUncheckedUpdateInput): Promise<ListingDetailRow> {
  return prisma.listing.update({ where: { id }, data, include: DETAIL_INCLUDE });
}

export async function softDeleteListing(id: string): Promise<void> {
  await prisma.listing.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function nextStockNumber(): Promise<string> {
  const year = new Date().getUTCFullYear();
  const count = await prisma.listing.count({
    where: { stockNumber: { startsWith: `BCPO-${year}-` } },
  });
  const next = String(count + 1).padStart(4, '0');
  return `BCPO-${year}-${next}`;
}

export async function recordPriceHistory(input: {
  listingId: string;
  fromFils: bigint;
  toFils: bigint;
  reason: string | null;
  changedById: string | null;
}): Promise<void> {
  await prisma.priceHistory.create({
    data: {
      listingId: input.listingId,
      fromFils: input.fromFils,
      toFils: input.toFils,
      reason: input.reason,
      changedById: input.changedById,
    },
  });
}
