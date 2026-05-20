/**
 * Saved listings (customer favourites) — service layer.
 *
 * Contract: CONCIERGE_INSPECTION_API_CONTRACT.md v1.2.0 §1 Q4 + §4 +
 * v1.2.1 §4.6.
 *
 * All exports marked `// public-shared` are consumed by A's thin controller
 * at `apps/api/src/saved-listings/saved-listings-public.controller.ts`.
 *
 * Idempotency: save + unsave are no-throw on the no-op path (re-save returns
 * `saved:false`, unsave-on-empty returns `removed:false`). Only the
 * non-existent listing case throws `LISTING_NOT_FOUND` so a customer's
 * heart-toggle UI never has to handle "already saved" as an error state.
 */

import type {
  SavedListingErrorCode,
  SavedListingListResponse,
  SavedListingSummary,
} from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

export class SavedListingError extends Error {
  constructor(public readonly code: SavedListingErrorCode, message: string) {
    super(message);
    this.name = 'SavedListingError';
  }
}

export interface SaveListingContext {
  ip?: string | null;
  userAgent?: string | null;
}

// ─── public-shared ──────────────────────────────────────────────────────────

/**
 * Paginated list of a customer's saved listings, newest-saved first. Joins
 * the Listing row + its hero photo so the my-favourites page doesn't have to
 * round-trip the listings-public endpoint per row.
 */
export async function getSavedListingsForCustomer(
  customerId: string,
  filter: { page: number; pageSize: number },
): Promise<SavedListingListResponse> {
  const page = Math.max(1, Math.floor(filter.page));
  const pageSize = Math.max(1, Math.min(100, Math.floor(filter.pageSize)));

  const where = { customerId };

  const [rows, total] = await Promise.all([
    prisma.savedListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        listing: {
          select: {
            id: true,
            stockNumber: true,
            titleEn: true,
            titleAr: true,
            priceFils: true,
            photos: {
              where: { isHero: true },
              orderBy: { sortOrder: 'asc' },
              take: 1,
              select: { cdnUrl: true },
            },
          },
        },
      },
    }),
    prisma.savedListing.count({ where }),
  ]);

  const items: SavedListingSummary[] = rows.map((row) => ({
    listingId: row.listing.id,
    stockNumber: row.listing.stockNumber,
    titleEn: row.listing.titleEn,
    titleAr: row.listing.titleAr,
    priceFils: row.listing.priceFils.toString(),
    heroPhotoUrl: row.listing.photos[0]?.cdnUrl ?? null,
    savedAt: row.createdAt.toISOString(),
  }));

  return { items, total, page, pageSize };
}

/**
 * Save a listing to the customer's favourites. Idempotent:
 *  - First save → `{ saved: true, createdAt: <new row> }`
 *  - Re-save → `{ saved: false, createdAt: <existing row> }`
 *
 * @throws SavedListingError('LISTING_NOT_FOUND') if listing id is invalid.
 */
export async function saveListing(
  customerId: string,
  listingId: string,
  _ctx: SaveListingContext = {},
): Promise<{ saved: boolean; createdAt: string }> {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, deletedAt: null },
    select: { id: true },
  });
  if (!listing) {
    throw new SavedListingError('LISTING_NOT_FOUND', 'Listing not found');
  }

  // Try-create with the composite PK as the dedupe key.
  const existing = await prisma.savedListing.findUnique({
    where: { customerId_listingId: { customerId, listingId } },
    select: { createdAt: true },
  });
  if (existing) {
    return { saved: false, createdAt: existing.createdAt.toISOString() };
  }

  const row = await prisma.savedListing.create({
    data: { customerId, listingId },
    select: { createdAt: true },
  });
  return { saved: true, createdAt: row.createdAt.toISOString() };
}

/**
 * Remove a listing from the customer's favourites. Idempotent — removing a
 * non-saved listing returns `removed:false` (no throw).
 */
export async function unsaveListing(
  customerId: string,
  listingId: string,
  _ctx: SaveListingContext = {},
): Promise<{ removed: boolean }> {
  const result = await prisma.savedListing.deleteMany({
    where: { customerId, listingId },
  });
  return { removed: result.count > 0 };
}

/**
 * Bulk check — given a list of listing ids, return only those the customer
 * has saved. Used by A's listing-card heart toggles to render initial state
 * without an N-roundtrip storm.
 *
 * Caps at 50 ids per call (enforced both here and at the schema layer in
 * `CheckSavedListingsQuerySchema`).
 */
export async function checkSavedListings(
  customerId: string,
  listingIds: string[],
): Promise<{ savedListingIds: string[] }> {
  const ids = Array.from(new Set(listingIds)).slice(0, 50);
  if (ids.length === 0) {
    return { savedListingIds: [] };
  }
  const rows = await prisma.savedListing.findMany({
    where: { customerId, listingId: { in: ids } },
    select: { listingId: true },
  });
  return { savedListingIds: rows.map((r) => r.listingId) };
}

// ─── HTTP-mapping helper ────────────────────────────────────────────────────

export function mapSavedListingErrorToHttp(
  err: SavedListingError,
): { status: number; body: { code: SavedListingErrorCode; error: string } } {
  const statusByCode: Record<SavedListingErrorCode, number> = {
    LISTING_NOT_FOUND: 404,
  };
  return { status: statusByCode[err.code], body: { code: err.code, error: err.message } };
}
