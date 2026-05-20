import { Router } from 'express';
import type {
  PublicCatalogBrand,
  PublicCatalogBodyType,
} from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

/**
 * Public customer-facing catalog router — NO auth required.
 * Returns active brands and body types with a count of currently PUBLISHED listings.
 */
export const catalogPublicRouter = Router();

const PUBLISHED_LISTING_WHERE = {
  deletedAt: null,
  stage: 'listed' as const,
  listedAt: { not: null },
};

catalogPublicRouter.get('/brands', async (_req, res, next) => {
  try {
    const [brands, counts] = await Promise.all([
      prisma.brand.findMany({
        where: { isActive: true },
        orderBy: { nameEn: 'asc' },
        select: { id: true, slug: true, nameEn: true, nameAr: true, logoUrl: true },
      }),
      prisma.listing.groupBy({
        by: ['brandId'],
        where: PUBLISHED_LISTING_WHERE,
        _count: { _all: true },
      }),
    ]);
    const countByBrand = new Map(counts.map((c) => [c.brandId, c._count._all]));
    /* Return ALL active brands so the customer "Browse by Brand" grid mirrors
       the admin catalog. Consumers that only want filterable brands (e.g. the
       Featured filter dropdown) should filter client-side on `listingCount > 0`. */
    const items: PublicCatalogBrand[] = brands.map((b) => ({
      ...b,
      listingCount: countByBrand.get(b.id) ?? 0,
    }));
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

catalogPublicRouter.get('/body-types', async (_req, res, next) => {
  try {
    const [bodyTypes, counts] = await Promise.all([
      prisma.bodyType.findMany({
        where: { isActive: true },
        orderBy: { nameEn: 'asc' },
        select: { id: true, slug: true, nameEn: true, nameAr: true },
      }),
      prisma.listing.groupBy({
        by: ['bodyTypeId'],
        where: PUBLISHED_LISTING_WHERE,
        _count: { _all: true },
      }),
    ]);
    const countByBody = new Map(counts.map((c) => [c.bodyTypeId, c._count._all]));
    const items: PublicCatalogBodyType[] = bodyTypes.map((b) => ({
      ...b,
      listingCount: countByBody.get(b.id) ?? 0,
    }));
    res.json({ items });
  } catch (err) {
    next(err);
  }
});
