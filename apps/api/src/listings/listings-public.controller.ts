import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import {
  ListingPublicFilterSchema,
  type ListingPublicSummary,
  type PublicListingSort,
} from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

/**
 * Detail-only DTO for `GET /v1/public/listings/:slug`.
 *
 * Intentionally declared INLINE here (not in `libs/shared/types`) so the
 * customer storefront contract for the rest of the public surface
 * (`ListingPublicSummary`) stays untouched. The frontend mirrors this type.
 *
 * Strips: vin, costFils, accidentNotes, assignedSalesId, createdById,
 * agingDiscountEnabled, priceHistory, inspectionReport.reportJson,
 * inspectionReport.reportPdfKey, inspectionReport.externalRef, videos,
 * media360, createdAt, updatedAt.
 */
export interface ListingPublicDetail extends ListingPublicSummary {
  // Spec
  exteriorColor: string;
  interiorColor: string;
  drivetrain: 'fwd' | 'rwd' | 'awd' | 'four_wd';
  seats: number;
  doors: number;
  engineCc: number | null;
  cylinders: number | null;
  gccSpec: boolean;
  previousOwners: number;
  serviceHistory: boolean;
  /** Boolean only — free-text `accidentNotes` is internal. */
  accidentHistory: boolean;
  // Description (already on Listing)
  descriptionEn: string | null;
  descriptionAr: string | null;
  /** Full ordered gallery (sortOrder asc). Hero photo is also present here. */
  photos: Array<{ cdnUrl: string; sortOrder: number; isHero: boolean }>;
  /** Inspection — only public-safe fields, or null when not inspected. */
  inspectionReport: {
    overallScore: number | null;
    inspectedAt: string | null;
  } | null;
  /** ISO timestamp string — drives the "Listed N days ago" trust badge. */
  listedAt: string;
}

/**
 * Public customer-facing listings router — NO auth required.
 * Returns only PUBLISHED listings (stage='listed', listedAt set, not deleted)
 * and strips all internal fields (vin, costFils, notes, audit trail, sales-agent).
 */
export const listingsPublicRouter = Router();

const PUBLIC_INCLUDE = {
  brand: { select: { id: true, slug: true, nameEn: true, nameAr: true, logoUrl: true } },
  model: { select: { id: true, nameEn: true, nameAr: true } },
  bodyType: { select: { id: true, slug: true, nameEn: true, nameAr: true } },
  photos: {
    where: { isHero: true },
    take: 1,
    select: { cdnUrl: true },
  },
  /* Relation, not a scalar FK on Listing (the FK lives on InspectionReport.listingId).
     Selecting just `id` lets us derive the `inspected` boolean cheaply. */
  inspectionReport: { select: { id: true } },
} satisfies Prisma.ListingInclude;

type PublicRow = Prisma.ListingGetPayload<{ include: typeof PUBLIC_INCLUDE }>;

/**
 * Detail include — superset of PUBLIC_INCLUDE used only by `:slug`.
 * Pulls the full ordered photo gallery and the public-safe inspection fields.
 */
const DETAIL_INCLUDE = {
  brand: { select: { id: true, slug: true, nameEn: true, nameAr: true, logoUrl: true } },
  model: { select: { id: true, nameEn: true, nameAr: true } },
  bodyType: { select: { id: true, slug: true, nameEn: true, nameAr: true } },
  photos: {
    orderBy: { sortOrder: 'asc' },
    select: { cdnUrl: true, sortOrder: true, isHero: true },
  },
  inspectionReport: { select: { overallScore: true, inspectedAt: true } },
} satisfies Prisma.ListingInclude;

type DetailRow = Prisma.ListingGetPayload<{ include: typeof DETAIL_INCLUDE }>;

/** WHERE clause that ensures only PUBLISHED, non-deleted listings escape. */
function publicWhere(extra: Prisma.ListingWhereInput = {}): Prisma.ListingWhereInput {
  return {
    deletedAt: null,
    stage: 'listed',
    listedAt: { not: null },
    ...extra,
  };
}

/** Structural minimum needed by `deriveBadge` — keeps it usable from both
 *  PUBLIC_INCLUDE rows and the richer DETAIL_INCLUDE rows. */
type BadgeRow = {
  mileageKm: number;
  inspectionReport: unknown | null;
  listedAt: Date | null;
};

function deriveBadge(row: BadgeRow): ListingPublicSummary['badge'] {
  if (row.mileageKm < 25000) return 'lowMileage';
  if (row.inspectionReport !== null) return 'inspected';
  if (row.listedAt) {
    const ageMs = Date.now() - row.listedAt.getTime();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    if (ageMs < fourteenDays) return 'recentlyAdded';
  }
  return null;
}

function toPublicSummary(row: PublicRow): ListingPublicSummary {
  const priceFils = row.priceFils;
  /* Placeholder monthly estimate — divide price by 48 months. Replace with a
     real bank-quote endpoint once financing flows are wired. */
  const monthlyFils = (priceFils / 48n).toString();
  return {
    id: row.id,
    slug: row.slug,
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    brand: row.brand,
    model: row.model,
    bodyType: row.bodyType,
    year: row.year,
    mileageKm: row.mileageKm,
    priceFils: priceFils.toString(),
    monthlyFils,
    transmission: row.transmission,
    fuelType: row.fuelType,
    heroPhotoUrl: row.photos[0]?.cdnUrl ?? null,
    badge: deriveBadge(row),
    inspected: row.inspectionReport !== null,
  };
}

function toPublicDetail(row: DetailRow): ListingPublicDetail {
  const priceFils = row.priceFils;
  const monthlyFils = (priceFils / 48n).toString();

  /* Hero URL for the summary half — first photo flagged isHero, else the
     first one in sortOrder, else null. Mirrors PUBLIC_INCLUDE semantics so
     `heroPhotoUrl` stays stable across summary and detail. */
  const heroPhoto = row.photos.find((p) => p.isHero) ?? row.photos[0] ?? null;

  /* Drop photos without a CDN URL (pending uploads). `cdnUrl` is nullable on
     ListingPhoto but the public contract guarantees a string. */
  const gallery = row.photos
    .filter((p): p is typeof p & { cdnUrl: string } => p.cdnUrl !== null)
    .map((p) => ({ cdnUrl: p.cdnUrl, sortOrder: p.sortOrder, isHero: p.isHero }));

  return {
    // --- ListingPublicSummary half ---
    id: row.id,
    slug: row.slug,
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    brand: row.brand,
    model: row.model,
    bodyType: row.bodyType,
    year: row.year,
    mileageKm: row.mileageKm,
    priceFils: priceFils.toString(),
    monthlyFils,
    transmission: row.transmission,
    fuelType: row.fuelType,
    heroPhotoUrl: heroPhoto?.cdnUrl ?? null,
    badge: deriveBadge(row),
    inspected: row.inspectionReport !== null,
    // --- Detail-only spec ---
    exteriorColor: row.exteriorColor,
    interiorColor: row.interiorColor,
    drivetrain: row.drivetrain,
    seats: row.seats,
    doors: row.doors,
    engineCc: row.engineCc,
    cylinders: row.cylinders,
    gccSpec: row.gccSpec,
    previousOwners: row.previousOwners,
    serviceHistory: row.serviceHistory,
    accidentHistory: row.accidentHistory,
    descriptionEn: row.descriptionEn,
    descriptionAr: row.descriptionAr,
    photos: gallery,
    inspectionReport: row.inspectionReport
      ? {
          overallScore: row.inspectionReport.overallScore,
          inspectedAt: row.inspectionReport.inspectedAt?.toISOString() ?? null,
        }
      : null,
    /* `publicWhere` enforces `listedAt: { not: null }`, so the non-null
       assertion here is safe at runtime. */
    listedAt: row.listedAt!.toISOString(),
  };
}

function orderByForSort(sort: PublicListingSort): Prisma.ListingOrderByWithRelationInput[] {
  switch (sort) {
    case 'priceAsc':
      return [{ priceFils: 'asc' }];
    case 'priceDesc':
      return [{ priceFils: 'desc' }];
    case 'mileageAsc':
      return [{ mileageKm: 'asc' }];
    case 'newest':
      return [{ listedAt: 'desc' }];
    case 'featured':
    default:
      /* Featured: newest published first. Inspection-prioritization happens
         on the read side via deriveBadge — Prisma can't directly orderBy a
         1-to-1 optional relation's existence without raw SQL. */
      return [{ listedAt: 'desc' }];
  }
}

async function resolveBrandId(slugOrId: string): Promise<string | null> {
  const byId = await prisma.brand.findUnique({ where: { id: slugOrId }, select: { id: true } });
  if (byId) return byId.id;
  const bySlug = await prisma.brand.findUnique({ where: { slug: slugOrId }, select: { id: true } });
  return bySlug?.id ?? null;
}

async function resolveBodyTypeId(slugOrId: string): Promise<string | null> {
  const byId = await prisma.bodyType.findUnique({ where: { id: slugOrId }, select: { id: true } });
  if (byId) return byId.id;
  const bySlug = await prisma.bodyType.findUnique({ where: { slug: slugOrId }, select: { id: true } });
  return bySlug?.id ?? null;
}

/** GET /v1/public/listings — paginated public list with filters. */
listingsPublicRouter.get('/', async (req, res, next) => {
  try {
    const filter = ListingPublicFilterSchema.parse(req.query);
    const extra: Prisma.ListingWhereInput = {};
    if (filter.brand) {
      const brandId = await resolveBrandId(filter.brand);
      if (!brandId) {
        res.json({ items: [], total: 0, page: filter.page, pageSize: filter.pageSize });
        return;
      }
      extra.brandId = brandId;
    }
    if (filter.body) {
      const bodyTypeId = await resolveBodyTypeId(filter.body);
      if (!bodyTypeId) {
        res.json({ items: [], total: 0, page: filter.page, pageSize: filter.pageSize });
        return;
      }
      extra.bodyTypeId = bodyTypeId;
    }
    if (filter.budgetMaxFils !== undefined) {
      extra.priceFils = { lte: BigInt(filter.budgetMaxFils) };
    }
    const where = publicWhere(extra);
    const [rows, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: PUBLIC_INCLUDE,
        orderBy: orderByForSort(filter.sort),
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.listing.count({ where }),
    ]);
    res.json({
      items: rows.map(toPublicSummary),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /v1/public/listings/featured — hero/featured carousel feed.
 *
 *  We fetch 32 most-recent published listings, then sort in-memory so the
 *  inspected ones land at the top (priority not directly expressible in
 *  Prisma's orderBy for a 1-to-1 optional relation). Final cap: 8.
 */
listingsPublicRouter.get('/featured', async (_req, res, next) => {
  try {
    const where = publicWhere();
    const rows = await prisma.listing.findMany({
      where,
      include: PUBLIC_INCLUDE,
      orderBy: [{ listedAt: 'desc' }],
      take: 32,
    });
    const sorted = [...rows].sort((a, b) => {
      const aIns = a.inspectionReport ? 1 : 0;
      const bIns = b.inspectionReport ? 1 : 0;
      if (aIns !== bIns) return bIns - aIns;
      return (b.listedAt?.getTime() ?? 0) - (a.listedAt?.getTime() ?? 0);
    }).slice(0, 8);
    res.json({ items: sorted.map(toPublicSummary), total: sorted.length, page: 1, pageSize: 8 });
  } catch (err) {
    next(err);
  }
});

/** GET /v1/public/listings/low-mileage — ascending mileage rail. */
listingsPublicRouter.get('/low-mileage', async (_req, res, next) => {
  try {
    const where = publicWhere();
    const rows = await prisma.listing.findMany({
      where,
      include: PUBLIC_INCLUDE,
      orderBy: [{ mileageKm: 'asc' }],
      take: 8,
    });
    res.json({ items: rows.map(toPublicSummary), total: rows.length, page: 1, pageSize: 8 });
  } catch (err) {
    next(err);
  }
});

/** GET /v1/public/listings/:slug — public detail by URL slug.
 *
 *  Returns the richer `ListingPublicDetail` shape (spec, full ordered photo
 *  gallery, public-safe inspection summary). The list/featured/low-mileage
 *  endpoints intentionally keep the lighter `ListingPublicSummary` shape.
 */
listingsPublicRouter.get('/:slug', async (req, res, next) => {
  try {
    const where = publicWhere({ slug: req.params.slug });
    const row = await prisma.listing.findFirst({ where, include: DETAIL_INCLUDE });
    if (!row) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(toPublicDetail(row));
  } catch (err) {
    next(err);
  }
});
