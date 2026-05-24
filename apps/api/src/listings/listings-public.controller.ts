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
 * inspectionReport.reportPdfKey, inspectionReport.externalRef,
 * createdAt, updatedAt.
 *
 * v1.5.16 — Surfaces rich-media (walk-around video + 360° exterior spin) so
 * customer VDP can render the player when present. Only `uploadStatus='complete'`
 * rows are returned; null when no media has been uploaded for the listing.
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
  /**
   * v1.5.16 — Walk-around video (rendered via `<video controls playsinline>`).
   * Null when no video has been uploaded for this listing or upload is still
   * pending. `posterUrl` is the poster frame to show before playback starts.
   */
  walkaroundVideo: {
    url: string;
    mimeType: string;
    posterUrl: string | null;
    durationS: number | null;
  } | null;
  /**
   * v1.5.16 — 360° exterior spin. `archiveUrl` is either an MP4 (rendered as
   * a scrub-bar `<video>` without controls) or a `.zip` of frames (client
   * unzips client-side). `mimeType` discriminates. Null when no 360 uploaded.
   */
  spin360: {
    archiveUrl: string;
    mimeType: string;
    frameCount: number | null;
  } | null;
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
 * Pulls the full ordered photo gallery, public-safe inspection fields, and
 * (v1.5.16) the rich-media rows (video + 360 spin) when upload is complete.
 *
 * For both video + 360 we take just the first complete row — the admin UI
 * enforces at-most-one of each per listing. `media360` is a 1:1 relation on
 * the Listing model so it's a singleton, but `videos` is 1:N — we still cap
 * at 1 (admin enforces a 409 conflict in presignVideo for second uploads).
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
  // v1.5.16 — surface walk-around video (only complete uploads).
  videos: {
    where: { uploadStatus: 'complete' },
    orderBy: { createdAt: 'asc' },
    take: 1,
    select: {
      cdnUrl: true,
      s3Key: true,
      mimeType: true,
      posterS3Key: true,
      durationS: true,
    },
  },
  // v1.5.16 — surface 360° exterior spin (only when complete).
  media360: {
    select: {
      archiveS3Key: true,
      mimeType: true,
      frameCount: true,
      uploadStatus: true,
    },
  },
} satisfies Prisma.ListingInclude;

type DetailRow = Prisma.ListingGetPayload<{ include: typeof DETAIL_INCLUDE }>;

/** WHERE clause that ensures only PUBLISHED, non-deleted listings escape.
 *  `photos: { some: {} }` guarantees at least one photo row exists so the
 *  public surface never surfaces a listing with a broken/missing hero image.
 */
function publicWhere(extra: Prisma.ListingWhereInput = {}): Prisma.ListingWhereInput {
  return {
    deletedAt: null,
    stage: 'listed',
    listedAt: { not: null },
    photos: { some: {} },
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

  /* v1.5.16 — Walk-around video. Prefer `cdnUrl` (set on confirm); fall back
     to `s3Key` for safety. `posterS3Key` becomes posterUrl when present.
     URLs may be relative paths (`/static/demo-media/...`) for demo content or
     absolute CDN URLs (Cloudfront/S3 signed) for production — customer client
     handles both. */
  const videoRow = row.videos[0] ?? null;
  const walkaroundVideo: ListingPublicDetail['walkaroundVideo'] =
    videoRow && (videoRow.cdnUrl || videoRow.s3Key)
      ? {
          url: videoRow.cdnUrl ?? videoRow.s3Key,
          mimeType: videoRow.mimeType ?? 'video/mp4',
          posterUrl: videoRow.posterS3Key ?? null,
          durationS: videoRow.durationS ?? null,
        }
      : null;

  /* v1.5.16 — 360° spin. Only include when the upload completed; pending /
     failed uploads are hidden. archiveS3Key may be relative for demo content. */
  const m360 = row.media360;
  const spin360: ListingPublicDetail['spin360'] =
    m360 && m360.uploadStatus === 'complete'
      ? {
          archiveUrl: m360.archiveS3Key,
          mimeType: m360.mimeType ?? 'video/mp4',
          frameCount: m360.frameCount ?? null,
        }
      : null;

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
    // v1.5.16
    walkaroundVideo,
    spin360,
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
 *  v1.5.18 (closes A v1.5-D11f [ASK A→B-5]): now respects the admin-controlled
 *  `featuredAt` flag set via `PATCH /v1/admin/listings/:id/featured`. The
 *  previous implementation ignored the flag and returned "8 most-recent listed
 *  + inspected-first in-memory sort", so admin toggles had no effect on the
 *  customer rail. Behaviour now:
 *    - Only listings with `featuredAt IS NOT NULL` are returned.
 *    - Sorted newest-featured first (matches admin intent: most recently
 *      promoted appears leftmost).
 *    - Cap at 8 (matches the home rail visual budget — see web `featured-cars`).
 *    - Empty list when no admin has flagged anything → home rail collapses
 *      gracefully (A confirmed `featuredCache$` handles `[]` cleanly).
 */
listingsPublicRouter.get('/featured', async (_req, res, next) => {
  try {
    const where: Prisma.ListingWhereInput = {
      ...publicWhere(),
      featuredAt: { not: null },
    };
    const rows = await prisma.listing.findMany({
      where,
      include: PUBLIC_INCLUDE,
      orderBy: [{ featuredAt: 'desc' }],
      take: 8,
    });
    res.json({ items: rows.map(toPublicSummary), total: rows.length, page: 1, pageSize: 8 });
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
 *
 *  Guard: if the listing exists but has 0 photos, return 404 with
 *  LISTING_NOT_PUBLISHABLE so clients can handle the unpublishable state.
 *  (publicWhere already excludes 0-photo rows from list queries; this guard
 *  covers the direct-slug lookup which first checks existence then photos.)
 */
listingsPublicRouter.get('/:slug', async (req, res, next) => {
  try {
    // First: check the listing exists and is published (ignoring photo count).
    const existsWhere: Prisma.ListingWhereInput = {
      deletedAt: null,
      stage: 'listed',
      listedAt: { not: null },
      slug: req.params.slug,
    };
    const exists = await prisma.listing.findFirst({
      where: existsWhere,
      select: { id: true, _count: { select: { photos: true } } },
    });
    if (!exists) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    if (exists._count.photos === 0) {
      res.status(404).json({ error: 'LISTING_NOT_PUBLISHABLE' });
      return;
    }

    // Full fetch with DETAIL_INCLUDE (publicWhere already requires photos:some).
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
