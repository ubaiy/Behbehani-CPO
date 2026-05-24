import type {
  ChangeStageDto,
  CreateListingDto,
  ListingDetail,
  ListingFilter,
  ListingStage,
  ListingSummary,
  Paginated,
  UpdateListingDto,
} from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';
import { maskVin } from '@behbehani-cpo/shared-types';
import {
  createListing as repoCreate,
  findListingById,
  findListingByVin,
  listListings,
  nextStockNumber,
  recordPriceHistory,
  softDeleteListing,
  updateListing as repoUpdate,
  type ListingDetailRow,
  type ListingSummaryRow,
} from './listings.repo';

export class ListingError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const dayMs = 1000 * 60 * 60 * 24;

function daysOnLot(listedAt: Date | null, createdAt: Date): number {
  const start = (listedAt ?? createdAt).getTime();
  return Math.max(0, Math.floor((Date.now() - start) / dayMs));
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function toSummary(row: ListingSummaryRow): ListingSummary {
  return {
    id: row.id,
    stockNumber: row.stockNumber,
    vinMasked: maskVin(row.vin),
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    brand: row.brand,
    model: row.model,
    trim: row.trim ? { id: row.trim.id, name: row.trim.name } : null,
    bodyType: row.bodyType,
    year: row.year,
    mileageKm: row.mileageKm,
    priceFils: row.priceFils.toString(),
    stage: row.stage as ListingStage,
    heroPhotoUrl: row.photos[0]?.cdnUrl ?? null,
    assignedSales: row.assignedSales ? { id: row.assignedSales.id, fullName: row.assignedSales.fullName } : null,
    daysOnLot: daysOnLot(row.listedAt, row.createdAt),
    featuredAt: row.featuredAt ? row.featuredAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: ListingDetailRow): ListingDetail {
  const summary = toSummary(row);
  return {
    ...summary,
    vin: row.vin,
    trimId: row.trimId,
    exteriorColor: row.exteriorColor,
    interiorColor: row.interiorColor,
    transmission: row.transmission as ListingDetail['transmission'],
    fuelType: row.fuelType as ListingDetail['fuelType'],
    engineCc: row.engineCc,
    cylinders: row.cylinders,
    drivetrain: row.drivetrain as ListingDetail['drivetrain'],
    seats: row.seats,
    doors: row.doors,
    gccSpec: row.gccSpec,
    previousOwners: row.previousOwners,
    serviceHistory: row.serviceHistory,
    accidentHistory: row.accidentHistory,
    accidentNotes: row.accidentNotes,
    costFils: row.costFils ? row.costFils.toString() : null,
    agingDiscountEnabled: row.agingDiscountEnabled,
    descriptionEn: row.descriptionEn,
    descriptionAr: row.descriptionAr,
    listedAt: row.listedAt ? row.listedAt.toISOString() : null,
    reservedAt: row.reservedAt ? row.reservedAt.toISOString() : null,
    soldAt: row.soldAt ? row.soldAt.toISOString() : null,
    photos: row.photos.map((p) => ({
      id: p.id,
      cdnUrl: p.cdnUrl,
      altEn: p.altEn,
      altAr: p.altAr,
      isHero: p.isHero,
      sortOrder: p.sortOrder,
    })),
    videos: row.videos.map((v) => ({ id: v.id, cdnUrl: v.cdnUrl, durationS: v.durationS })),
    priceHistory: row.priceHistory.map((p) => ({
      id: p.id.toString(),
      fromFils: p.fromFils.toString(),
      toFils: p.toFils.toString(),
      reason: p.reason,
      changedBy: p.changedBy ? { id: p.changedBy.id, fullName: p.changedBy.fullName } : null,
      createdAt: p.createdAt.toISOString(),
    })),
    inspectionReport: row.inspectionReport
      ? {
          id: row.inspectionReport.id,
          overallScore: row.inspectionReport.overallScore,
          reportPdfKey: row.inspectionReport.reportPdfKey,
          inspectedAt: row.inspectionReport.inspectedAt ? row.inspectionReport.inspectedAt.toISOString() : null,
        }
      : null,
  };
}

export async function listForAdmin(filter: ListingFilter): Promise<Paginated<ListingSummary>> {
  const { rows, total } = await listListings(filter);
  return {
    items: rows.map(toSummary),
    total,
    page: filter.page,
    pageSize: filter.pageSize,
  };
}

export async function getForAdmin(id: string): Promise<ListingDetail> {
  const row = await findListingById(id);
  if (!row) throw new ListingError(404, 'Listing not found');
  return toDetail(row);
}

export async function create(dto: CreateListingDto, actorId: string): Promise<ListingDetail> {
  const existing = await findListingByVin(dto.vin);
  if (existing) throw new ListingError(409, 'A listing with this VIN already exists');

  const stockNumber = await nextStockNumber();
  const slug = `${slugify(dto.titleEn)}-${stockNumber.toLowerCase()}`;
  const row = await repoCreate({
    stockNumber,
    slug,
    vin: dto.vin,
    titleEn: dto.titleEn,
    titleAr: dto.titleAr,
    brandId: dto.brandId,
    modelId: dto.modelId,
    trimId: dto.trimId,
    bodyTypeId: dto.bodyTypeId,
    year: dto.year,
    mileageKm: dto.mileageKm,
    exteriorColor: dto.exteriorColor,
    interiorColor: dto.interiorColor,
    transmission: dto.transmission,
    fuelType: dto.fuelType,
    engineCc: dto.engineCc,
    cylinders: dto.cylinders,
    drivetrain: dto.drivetrain,
    seats: dto.seats,
    doors: dto.doors,
    gccSpec: dto.gccSpec ?? true,
    previousOwners: dto.previousOwners ?? 1,
    serviceHistory: dto.serviceHistory ?? false,
    accidentHistory: dto.accidentHistory ?? false,
    accidentNotes: dto.accidentNotes,
    priceFils: BigInt(dto.priceFils),
    costFils: dto.costFils !== undefined ? BigInt(dto.costFils) : null,
    agingDiscountEnabled: dto.agingDiscountEnabled ?? true,
    descriptionEn: dto.descriptionEn,
    descriptionAr: dto.descriptionAr,
    createdById: actorId,
    assignedSalesId: dto.assignedSalesId,
  });
  return toDetail(row);
}

export async function update(id: string, dto: UpdateListingDto, actorId: string): Promise<ListingDetail> {
  const before = await findListingById(id);
  if (!before) throw new ListingError(404, 'Listing not found');

  if (dto.vin && dto.vin !== before.vin) {
    const conflict = await findListingByVin(dto.vin);
    if (conflict && conflict.id !== id) throw new ListingError(409, 'A listing with this VIN already exists');
  }

  const next = await repoUpdate(id, {
    titleEn: dto.titleEn,
    titleAr: dto.titleAr,
    brandId: dto.brandId,
    modelId: dto.modelId,
    trimId: dto.trimId,
    bodyTypeId: dto.bodyTypeId,
    vin: dto.vin,
    year: dto.year,
    mileageKm: dto.mileageKm,
    exteriorColor: dto.exteriorColor,
    interiorColor: dto.interiorColor,
    transmission: dto.transmission,
    fuelType: dto.fuelType,
    engineCc: dto.engineCc,
    cylinders: dto.cylinders,
    drivetrain: dto.drivetrain,
    seats: dto.seats,
    doors: dto.doors,
    gccSpec: dto.gccSpec,
    previousOwners: dto.previousOwners,
    serviceHistory: dto.serviceHistory,
    accidentHistory: dto.accidentHistory,
    accidentNotes: dto.accidentNotes,
    priceFils: dto.priceFils !== undefined ? BigInt(dto.priceFils) : undefined,
    costFils: dto.costFils !== undefined ? BigInt(dto.costFils) : undefined,
    agingDiscountEnabled: dto.agingDiscountEnabled,
    descriptionEn: dto.descriptionEn,
    descriptionAr: dto.descriptionAr,
    assignedSalesId: dto.assignedSalesId,
  });

  if (dto.priceFils !== undefined && BigInt(dto.priceFils) !== before.priceFils) {
    await recordPriceHistory({
      listingId: id,
      fromFils: before.priceFils,
      toFils: BigInt(dto.priceFils),
      reason: null,
      changedById: actorId,
    });
  }

  return toDetail(next);
}

/**
 * Stages that surface a listing to the public storefront.
 * Any transition INTO one of these stages requires at least 1 photo.
 */
const PUBLIC_STAGES = new Set<ListingStage>(['listed', 'reserved', 'sold', 'delivered']);

export async function changeStage(id: string, dto: ChangeStageDto, actorId: string): Promise<ListingDetail> {
  const before = await findListingById(id);
  if (!before) throw new ListingError(404, 'Listing not found');
  assertStageTransition(before.stage as ListingStage, dto.stage);

  // Guard: transitioning to any public-visible stage requires at least 1 photo.
  if (PUBLIC_STAGES.has(dto.stage)) {
    const photoCount = await prisma.listingPhoto.count({ where: { listingId: id } });
    if (photoCount === 0) {
      throw new ListingError(422, 'LISTING_PHOTOS_REQUIRED');
    }
  }

  const patch: Record<string, Date> = {};
  if (dto.stage === 'listed' && !before.listedAt) patch.listedAt = new Date();
  if (dto.stage === 'reserved' && !before.reservedAt) patch.reservedAt = new Date();
  if (dto.stage === 'sold' && !before.soldAt) patch.soldAt = new Date();

  const next = await repoUpdate(id, { stage: dto.stage, ...patch });
  await recordPriceHistory({
    listingId: id,
    fromFils: before.priceFils,
    toFils: next.priceFils,
    reason: `stage:${before.stage}->${dto.stage}${dto.reason ? ` ${dto.reason}` : ''}`,
    changedById: actorId,
  });
  return toDetail(next);
}

export async function archive(id: string): Promise<void> {
  const before = await findListingById(id);
  if (!before) throw new ListingError(404, 'Listing not found');
  await softDeleteListing(id);
}

/**
 * Toggle the operator-curated "Featured" flag.
 * Idempotent — re-featuring an already-featured listing is a no-op and
 * preserves the original `featuredAt` timestamp (so the storefront ordering
 * doesn't reshuffle for a UI-only refresh).
 *
 * Returns `{ before, after, changed }`. `changed` lets the caller skip the
 * audit log emission on a no-op for less noise.
 */
export async function setFeatured(
  id: string,
  featured: boolean,
): Promise<{ before: ListingDetail; after: ListingDetail; changed: boolean }> {
  const beforeRow = await findListingById(id);
  if (!beforeRow) throw new ListingError(404, 'Listing not found');
  const wasFeatured = beforeRow.featuredAt !== null;
  if (wasFeatured === featured) {
    const detail = toDetail(beforeRow);
    return { before: detail, after: detail, changed: false };
  }
  const afterRow = await repoUpdate(id, { featuredAt: featured ? new Date() : null });
  return { before: toDetail(beforeRow), after: toDetail(afterRow), changed: true };
}

// FR-ADM-005 stage progression. Closed is terminal. Reserved/sold can also
// fall back if a reservation is cancelled.
const ALLOWED_TRANSITIONS: Record<ListingStage, ListingStage[]> = {
  acquired: ['inbound', 'closed'],
  inbound: ['inspection', 'closed'],
  inspection: ['photoshoot', 'reconditioning', 'closed'],
  photoshoot: ['reconditioning', 'listed', 'closed'],
  reconditioning: ['photoshoot', 'listed', 'closed'],
  listed: ['reserved', 'closed'],
  reserved: ['listed', 'sold', 'closed'],
  sold: ['delivered', 'closed'],
  delivered: ['closed'],
  closed: [],
};

function assertStageTransition(from: ListingStage, to: ListingStage): void {
  if (from === to) return;
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new ListingError(422, `Cannot move listing from ${from} to ${to}`);
  }
}
