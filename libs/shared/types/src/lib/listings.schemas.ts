import { z } from 'zod';

/**
 * Vehicle listing DTOs shared between API and admin/web.
 * Plan reference: SRS §6.4 + FR-ADM-005 (pipeline) + FR-CAR-001..018.
 *
 * Prices are transported as integers in fils (1 KWD = 1000 fils) to avoid
 * floating-point drift. The shared `formatKwd` util renders them back to
 * "X.XXX KWD" at the UI boundary.
 */

export const LISTING_STAGES = [
  'acquired',
  'inbound',
  'inspection',
  'photoshoot',
  'reconditioning',
  'listed',
  'reserved',
  'sold',
  'delivered',
  'closed',
] as const;
export type ListingStage = (typeof LISTING_STAGES)[number];

/** Zod enum for listing stages — import this in pricing/aging schemas. */
export const listingStageSchema = z.enum(LISTING_STAGES);

export const TRANSMISSIONS = ['automatic', 'manual', 'cvt', 'dct'] as const;
export type Transmission = (typeof TRANSMISSIONS)[number];

export const FUEL_TYPES = ['petrol', 'diesel', 'hybrid', 'electric'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const DRIVETRAINS = ['fwd', 'rwd', 'awd', 'four_wd'] as const;
export type Drivetrain = (typeof DRIVETRAINS)[number];

export const VinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(17)
  .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'VIN must be 17 chars without I, O, or Q');

const CurrentYear = new Date().getUTCFullYear();

const ListingCoreSchema = z.object({
  titleEn: z.string().min(3).max(160),
  titleAr: z.string().max(160).optional(),
  brandId: z.string().uuid(),
  modelId: z.string().uuid(),
  trimId: z.string().uuid().optional(),
  bodyTypeId: z.string().uuid(),
  vin: VinSchema,
  year: z.number().int().min(1990).max(CurrentYear + 1),
  mileageKm: z.number().int().min(0).max(1_000_000),
  exteriorColor: z.string().min(1).max(60),
  interiorColor: z.string().min(1).max(60),
  transmission: z.enum(TRANSMISSIONS),
  fuelType: z.enum(FUEL_TYPES),
  engineCc: z.number().int().min(500).max(9000).optional(),
  cylinders: z.number().int().min(2).max(16).optional(),
  drivetrain: z.enum(DRIVETRAINS),
  seats: z.number().int().min(1).max(20),
  doors: z.number().int().min(2).max(6),
  gccSpec: z.boolean().default(true),
  previousOwners: z.number().int().min(0).max(20).default(1),
  serviceHistory: z.boolean().default(false),
  accidentHistory: z.boolean().default(false),
  accidentNotes: z.string().max(2000).optional(),
  // Price in fils (1 KWD = 1000). Keep it int to dodge float issues.
  priceFils: z.number().int().min(0).max(999_999_999),
  costFils: z.number().int().min(0).max(999_999_999).optional(),
  agingDiscountEnabled: z.boolean().default(true),
  descriptionEn: z.string().max(8000).optional(),
  descriptionAr: z.string().max(8000).optional(),
  assignedSalesId: z.string().uuid().optional(),
});

export const CreateListingSchema = ListingCoreSchema;
export type CreateListingDto = z.infer<typeof CreateListingSchema>;

export const UpdateListingSchema = ListingCoreSchema.partial();
export type UpdateListingDto = z.infer<typeof UpdateListingSchema>;

export const ChangeStageSchema = z.object({
  stage: z.enum(LISTING_STAGES),
  reason: z.string().max(500).optional(),
});
export type ChangeStageDto = z.infer<typeof ChangeStageSchema>;

export const ListingFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  brandId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  bodyTypeId: z.string().uuid().optional(),
  stage: z.enum(LISTING_STAGES).optional(),
  minPriceFils: z.coerce.number().int().min(0).optional(),
  maxPriceFils: z.coerce.number().int().min(0).optional(),
  minYear: z.coerce.number().int().min(1990).optional(),
  maxYear: z.coerce.number().int().max(CurrentYear + 1).optional(),
  assignedSalesId: z.string().uuid().optional(),
  // 'featured' filter — `true` returns only featured listings, `false` returns
  // only non-featured, undefined returns both. Stringified booleans accepted
  // from query strings (`?featured=true`).
  featured: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => (typeof v === 'string' ? v === 'true' : v))
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(['createdAt:desc', 'createdAt:asc', 'price:asc', 'price:desc', 'mileage:asc']).default('createdAt:desc'),
});
export type ListingFilter = z.infer<typeof ListingFilterSchema>;

export interface ListingSummary {
  id: string;
  stockNumber: string;
  vinMasked: string;
  titleEn: string;
  titleAr: string | null;
  brand: { id: string; nameEn: string; nameAr: string };
  model: { id: string; nameEn: string; nameAr: string };
  trim: { id: string; name: string } | null;
  bodyType: { id: string; nameEn: string; nameAr: string };
  year: number;
  mileageKm: number;
  priceFils: string; // BigInt serialised to string for JSON safety.
  stage: ListingStage;
  heroPhotoUrl: string | null;
  assignedSales: { id: string; fullName: string } | null;
  daysOnLot: number;
  /** ISO timestamp when the listing was marked Featured, or null. */
  featuredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Body of POST /v1/admin/listings/:id/featured */
export const SetFeaturedSchema = z.object({ featured: z.boolean() });
export type SetFeaturedDto = z.infer<typeof SetFeaturedSchema>;

export interface ListingDetail extends ListingSummary {
  /**
   * Full unmasked VIN. Admin-only — the public/customer listing detail will
   * use a separate DTO that omits this field. Forms need the full value to
   * pass VIN regex validation on edit.
   */
  vin: string;
  trimId: string | null;
  exteriorColor: string;
  interiorColor: string;
  transmission: Transmission;
  fuelType: FuelType;
  engineCc: number | null;
  cylinders: number | null;
  drivetrain: Drivetrain;
  seats: number;
  doors: number;
  gccSpec: boolean;
  previousOwners: number;
  serviceHistory: boolean;
  accidentHistory: boolean;
  accidentNotes: string | null;
  costFils: string | null;
  agingDiscountEnabled: boolean;
  descriptionEn: string | null;
  descriptionAr: string | null;
  listedAt: string | null;
  reservedAt: string | null;
  soldAt: string | null;
  photos: Array<{ id: string; cdnUrl: string | null; altEn: string | null; altAr: string | null; isHero: boolean; sortOrder: number }>;
  videos: Array<{ id: string; cdnUrl: string | null; durationS: number | null }>;
  priceHistory: Array<{ id: string; fromFils: string; toFils: string; reason: string | null; changedBy: { id: string; fullName: string } | null; createdAt: string }>;
  inspectionReport: { id: string; overallScore: number | null; reportPdfKey: string | null; inspectedAt: string | null } | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Mask all but the last 6 chars per FR-CAR-018 ("VIN last-6 masked"). */
export function maskVin(vin: string): string {
  const tail = vin.slice(-6);
  return `${'•'.repeat(Math.max(0, vin.length - 6))} ${tail}`.trim();
}
