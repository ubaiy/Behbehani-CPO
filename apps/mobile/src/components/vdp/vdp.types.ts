/**
 * Shared types for VDP sub-components.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

export interface InspectionCategory {
  name: string;
  score: number;
  maxScore: number;
}

/** Extended detail shape returned by the API (superset of ListingPublicSummary). */
export interface ListingDetail {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string | null;
  brand: { id: string; slug: string; nameEn: string; nameAr: string; logoUrl: string | null };
  model: { id: string; nameEn: string; nameAr: string };
  bodyType: { id: string; slug: string; nameEn: string; nameAr: string };
  year: number;
  mileageKm: number;
  priceFils: string;
  monthlyFils: string;
  transmission: string;
  fuelType: string;
  heroPhotoUrl: string | null;
  badge: string | null;
  inspected: boolean;
  // Extended detail fields (not yet in shared schema — TODO)
  trim?: string;
  exteriorColor?: string;
  interiorColor?: string;
  cylinders?: number;
  drivetrain?: string;
  regionalSpecs?: string;
  doors?: number;
  seats?: number;
  vin?: string;
  previousOwners?: number;
  accidentFlag?: 'none' | 'yes' | 'unknown';
  serviceHistory?: 'yes' | 'no' | 'unknown';
  inspectionScore?: number;
  inspectionDate?: string;
  inspectionCategories?: InspectionCategory[];
  photoUrls?: string[];
  dealerName?: string;
  dealerLocation?: string;
  dealerRating?: number;
  dealerStock?: number;
}
