import { z } from 'zod';

/**
 * Public-facing listing DTOs exposed to the customer-facing web app.
 *
 * Deliberately omits admin/internal fields: `vin` (full), `costFils`,
 * `accidentNotes`, `assignedSales`, `agingDiscountEnabled`, `priceHistory`,
 * the full `inspectionReport`, `createdAt`/`updatedAt`, internal videos.
 */

export const PUBLIC_BADGES = ['inspected', 'premium', 'lowMileage', 'priceDrop', 'recentlyAdded'] as const;
export type PublicListingBadge = (typeof PUBLIC_BADGES)[number];

export const PublicBrandRefSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  nameAr: z.string(),
  logoUrl: z.string().nullable(),
});
export type PublicBrandRef = z.infer<typeof PublicBrandRefSchema>;

export const PublicModelRefSchema = z.object({
  id: z.string(),
  nameEn: z.string(),
  nameAr: z.string(),
});
export type PublicModelRef = z.infer<typeof PublicModelRefSchema>;

export const PublicBodyTypeRefSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  nameAr: z.string(),
});
export type PublicBodyTypeRef = z.infer<typeof PublicBodyTypeRefSchema>;

export const ListingPublicSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  titleEn: z.string(),
  titleAr: z.string().nullable(),
  brand: PublicBrandRefSchema,
  model: PublicModelRefSchema,
  bodyType: PublicBodyTypeRefSchema,
  year: z.number().int(),
  mileageKm: z.number().int(),
  /** BigInt serialized as decimal string (1 KWD = 1000 fils). */
  priceFils: z.string(),
  /** Previous price before a price-drop, BigInt-as-string fils. Used for strikethrough display. */
  previousPriceFils: z.string().optional(),
  /** Estimated monthly installment (placeholder — divides price by 48). */
  monthlyFils: z.string(),
  transmission: z.string(),
  fuelType: z.string(),
  heroPhotoUrl: z.string().nullable(),
  badge: z.enum(PUBLIC_BADGES).nullable(),
  inspected: z.boolean(),
});
export type ListingPublicSummary = z.infer<typeof ListingPublicSummarySchema>;

/**
 * VDP (Vehicle Detail Page) schema — superset of ListingPublicSummarySchema.
 * All extended fields are OPTIONAL so the API can populate them incrementally
 * without breaking existing consumers that parse with the summary schema.
 */
export const PublicListingDetailSchema = ListingPublicSummarySchema.extend({
  vin: z.string().optional(),
  exteriorColor: z.string().optional(),
  interiorColor: z.string().optional(),
  trim: z.string().optional(),
  cylinders: z.number().int().nonnegative().optional(),
  /** Drive-train string kept flexible for forward compat: "AWD" | "FWD" | "RWD" | "4WD" */
  driveTrain: z.string().optional(),
  seats: z.number().int().nonnegative().optional(),
  doors: z.number().int().nonnegative().optional(),
  /** Regional spec string kept flexible: "GCC" | "US" | "Canadian" etc. */
  regionalSpecs: z.string().optional(),
  previousOwners: z.number().int().nonnegative().optional(),
  /** Accident history string kept flexible: "clean" | "minor" etc. */
  accidentHistory: z.string().optional(),
  serviceHistory: z.string().optional(),
  photos: z.array(z.object({
    url:     z.string().url(),
    caption: z.string().optional(),
    isHero:  z.boolean().optional(),
    width:   z.number().int().positive().optional(),
    height:  z.number().int().positive().optional(),
  })).optional(),
  inspectionReport: z.object({
    overallScore: z.number().min(0).max(100),
    categories: z.object({
      exterior:   z.number().min(0).max(100),
      mechanical: z.number().min(0).max(100),
      electronic: z.number().min(0).max(100),
      interior:   z.number().min(0).max(100),
      testDrive:  z.number().min(0).max(100),
    }),
  }).optional(),
  dealerName:       z.string().optional(),
  dealerLogo:       z.string().url().optional(),
  dealerStockCount: z.number().int().nonnegative().optional(),
  dealerRating:     z.number().min(0).max(5).optional(),
  dealerLocation:   z.string().optional(),
});
export type PublicListingDetailDto = z.infer<typeof PublicListingDetailSchema>;

export const ListingPublicListResponseSchema = z.object({
  items: z.array(ListingPublicSummarySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type ListingPublicListResponse = z.infer<typeof ListingPublicListResponseSchema>;

export const PUBLIC_LISTING_SORTS = ['featured', 'priceAsc', 'priceDesc', 'mileageAsc', 'newest'] as const;
export type PublicListingSort = (typeof PUBLIC_LISTING_SORTS)[number];

export const ListingPublicFilterSchema = z.object({
  brand: z.string().optional(),
  body: z.string().optional(),
  budgetMaxFils: z.coerce.number().int().positive().optional(),
  sort: z.enum(PUBLIC_LISTING_SORTS).default('featured'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});
export type ListingPublicFilter = z.infer<typeof ListingPublicFilterSchema>;

export const PublicCatalogBrandSchema = PublicBrandRefSchema.extend({
  listingCount: z.number().int().min(0),
});
export type PublicCatalogBrand = z.infer<typeof PublicCatalogBrandSchema>;

export const PublicCatalogBodyTypeSchema = PublicBodyTypeRefSchema.extend({
  listingCount: z.number().int().min(0),
});
export type PublicCatalogBodyType = z.infer<typeof PublicCatalogBodyTypeSchema>;

export const PublicCatalogBrandListResponseSchema = z.object({
  items: z.array(PublicCatalogBrandSchema),
});
export type PublicCatalogBrandListResponse = z.infer<typeof PublicCatalogBrandListResponseSchema>;

export const PublicCatalogBodyTypeListResponseSchema = z.object({
  items: z.array(PublicCatalogBodyTypeSchema),
});
export type PublicCatalogBodyTypeListResponse = z.infer<typeof PublicCatalogBodyTypeListResponseSchema>;
