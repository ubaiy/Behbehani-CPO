import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';
import type {
  ListingPublicListResponse,
  ListingPublicSummary,
  PublicCatalogBrand,
  PublicCatalogBodyType,
  PublicListingSort,
} from '@behbehani-cpo/shared-types';
import { FEATURED_CARS, BRANDS, BODY_TYPES } from './catalog.mock';
import type { FeaturedCar } from './catalog.types';

export interface PublicListingsQuery {
  brand?: string;
  body?: string;
  budgetMaxFils?: number;
  sort?: PublicListingSort;
  page?: number;
  pageSize?: number;
}

/**
 * Extended detail DTO returned by `GET /v1/public/listings/:slug` (richer than
 * `ListingPublicSummary`). The backend may still be returning summary shape
 * during rollout — every extended field is treated as optional at runtime so
 * the page degrades gracefully.
 */
export interface ListingPublicDetailPhoto {
  cdnUrl: string;
  sortOrder: number;
  isHero: boolean;
}

export interface ListingPublicDetail {
  // ---- summary fields (parity with ListingPublicSummary) ----
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
  transmission: 'automatic' | 'manual' | 'cvt' | 'dct';
  fuelType: 'petrol' | 'diesel' | 'hybrid' | 'electric';
  heroPhotoUrl: string | null;
  badge: 'inspected' | 'lowMileage' | 'recentlyAdded' | null;
  inspected: boolean;
  // ---- extended detail fields (may be missing while API rolls out) ----
  exteriorColor?: string;
  interiorColor?: string;
  drivetrain?: 'fwd' | 'rwd' | 'awd' | 'four_wd';
  seats?: number;
  doors?: number;
  engineCc?: number | null;
  cylinders?: number | null;
  gccSpec?: boolean;
  previousOwners?: number;
  serviceHistory?: boolean;
  accidentHistory?: boolean;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  photos?: ReadonlyArray<ListingPublicDetailPhoto>;
  inspectionReport?: { overallScore: number | null; inspectedAt: string | null } | null;
  listedAt?: string;
}

/**
 * Customer-facing data service. Consumes the public API endpoints at
 * `/api/v1/public/listings` and `/api/v1/public/catalog`. Falls back to the
 * typed mock dataset (`catalog.mock.ts`) when the API is unreachable or empty
 * so the home page never breaks during local dev or while the backend is
 * being seeded.
 */
@Injectable({ providedIn: 'root' })
export class PublicCatalogService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get listingsBase(): string {
    return `${this.config.baseUrl}/public/listings`;
  }

  private get catalogBase(): string {
    return `${this.config.baseUrl}/public/catalog`;
  }

  private readonly featuredCache$ = this.http
    .get<ListingPublicListResponse>(`${this.listingsBase}/featured`)
    .pipe(
      map((res) => (res.items.length > 0 ? res.items.map(toFeaturedCar) : MOCK_FEATURED)),
      catchError(() => of(MOCK_FEATURED)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  private readonly lowMileageCache$ = this.http
    .get<ListingPublicListResponse>(`${this.listingsBase}/low-mileage`)
    .pipe(
      map((res) => (res.items.length > 0 ? res.items.map(toFeaturedCar) : MOCK_LOW_MILEAGE)),
      catchError(() => of(MOCK_LOW_MILEAGE)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  private readonly brandsCache$ = this.http
    .get<{ items: PublicCatalogBrand[] }>(`${this.catalogBase}/brands`)
    .pipe(
      map((res) => (res.items.length > 0 ? res.items : MOCK_BRANDS)),
      catchError(() => of(MOCK_BRANDS)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  private readonly bodyTypesCache$ = this.http
    .get<{ items: PublicCatalogBodyType[] }>(`${this.catalogBase}/body-types`)
    .pipe(
      map((res) => (res.items.length > 0 ? res.items : MOCK_BODY_TYPES)),
      catchError(() => of(MOCK_BODY_TYPES)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  featured$(): Observable<ReadonlyArray<FeaturedCar>> {
    return this.featuredCache$;
  }

  lowMileage$(): Observable<ReadonlyArray<FeaturedCar>> {
    return this.lowMileageCache$;
  }

  brands$(): Observable<ReadonlyArray<PublicCatalogBrand>> {
    return this.brandsCache$;
  }

  bodyTypes$(): Observable<ReadonlyArray<PublicCatalogBodyType>> {
    return this.bodyTypesCache$;
  }

  /** Per-slug cache so back/forward navigation doesn't re-hit the API. */
  private readonly detailCache = new Map<string, Observable<ListingPublicDetail | null>>();

  /**
   * Fetch a listing by slug. Returns `null` if the API 404s or the slug is
   * unknown. While the API rolls out the extended detail shape, this also
   * accepts the existing summary shape — extended fields will be `undefined`
   * and the component must apply its own sensible defaults.
   */
  detail$(slug: string): Observable<ListingPublicDetail | null> {
    let cached = this.detailCache.get(slug);
    if (!cached) {
      cached = this.http.get<ListingPublicDetail>(`${this.listingsBase}/${slug}`).pipe(
        map((res) => res ?? null),
        catchError(() => of(buildMockDetail(slug))),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.detailCache.set(slug, cached);
    }
    return cached;
  }

  /** Filtered list — fresh request each call (filter combinations are unbounded). */
  list$(query: PublicListingsQuery): Observable<ReadonlyArray<FeaturedCar>> {
    const params: Record<string, string> = {};
    if (query.brand) params['brand'] = query.brand;
    if (query.body) params['body'] = query.body;
    if (query.budgetMaxFils !== undefined) params['budgetMaxFils'] = String(query.budgetMaxFils);
    if (query.sort) params['sort'] = query.sort;
    if (query.page !== undefined) params['page'] = String(query.page);
    if (query.pageSize !== undefined) params['pageSize'] = String(query.pageSize);
    return this.http.get<ListingPublicListResponse>(this.listingsBase, { params }).pipe(
      map((res) => res.items.map(toFeaturedCar)),
      catchError(() => of(filterMock(query))),
    );
  }
}

/** Convert API DTO → the existing FeaturedCar shape used by car-card. */
function toFeaturedCar(item: ListingPublicSummary): FeaturedCar {
  return {
    id: item.id,
    slug: item.slug,
    brand: item.brand.slug,
    model: item.titleEn || `${item.model.nameEn}`,
    year: item.year,
    mileage: item.mileageKm,
    price: Math.round(Number(item.priceFils) / 1000),
    monthly: Math.round(Number(item.monthlyFils) / 1000),
    body: item.bodyType.slug,
    transmission: capitalize(item.transmission),
    fuel: capitalize(item.fuelType),
    sellerType: 'Platform',
    inspected: item.inspected,
    badge: item.badge ?? 'inspected',
    image: item.heroPhotoUrl ?? '',
    fallbackColor: '#1E293B',
  };
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ===== Mock fallbacks — used when the API is unreachable or returns empty.
   The mock dataset already has the FeaturedCar shape, so no conversion needed. ===== */
const MOCK_FEATURED: ReadonlyArray<FeaturedCar> = FEATURED_CARS.slice(0, 8);
const MOCK_LOW_MILEAGE: ReadonlyArray<FeaturedCar> = [...FEATURED_CARS]
  .sort((a, b) => a.mileage - b.mileage)
  .slice(0, 8);
const MOCK_BRANDS: ReadonlyArray<PublicCatalogBrand> = BRANDS.map((b) => ({
  id: b.id,
  slug: b.id,
  nameEn: b.name,
  nameAr: b.nameAr,
  logoUrl: null,
  listingCount: deterministicCount(b.id),
}));
const MOCK_BODY_TYPES: ReadonlyArray<PublicCatalogBodyType> = BODY_TYPES.map((b) => ({
  id: b.id,
  slug: b.id,
  nameEn: b.name,
  nameAr: b.nameAr,
  listingCount: deterministicCount(b.id),
}));

function deterministicCount(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return 20 + (Math.abs(h) % 80);
}

/** Build a passable `ListingPublicDetail` from the mock catalog so the VDP
    renders during local dev or while the API endpoint is being extended.
    Matches by slug, but if the slug is unknown, returns the first mock car
    so the page is still demoable. Returns `null` only if the mock pool is
    somehow empty. */
function buildMockDetail(slug: string): ListingPublicDetail | null {
  if (FEATURED_CARS.length === 0) return null;
  const car =
    FEATURED_CARS.find((c) => c.id.toLowerCase() === slug.toLowerCase()) ?? FEATURED_CARS[0];
  const brand = BRANDS.find((b) => b.id === car.brand);
  const body = BODY_TYPES.find((b) => b.id === car.body);
  const brandRef = {
    id: car.brand,
    slug: car.brand,
    nameEn: brand?.name ?? car.brand,
    nameAr: brand?.nameAr ?? car.brand,
    logoUrl: null,
  };
  const bodyRef = {
    id: car.body,
    slug: car.body,
    nameEn: body?.name ?? car.body,
    nameAr: body?.nameAr ?? car.body,
  };
  return {
    id: car.id,
    slug,
    titleEn: `${car.year} ${brand?.name ?? car.brand} ${car.model}`,
    titleAr: `${brand?.nameAr ?? car.brand} ${car.model} ${car.year}`,
    brand: brandRef,
    model: { id: car.model, nameEn: car.model, nameAr: car.model },
    bodyType: bodyRef,
    year: car.year,
    mileageKm: car.mileage,
    priceFils: String(car.price * 1000),
    monthlyFils: String(car.monthly * 1000),
    transmission: (car.transmission.toLowerCase() as ListingPublicDetail['transmission']) ?? 'automatic',
    fuelType: (car.fuel.toLowerCase() as ListingPublicDetail['fuelType']) ?? 'petrol',
    heroPhotoUrl: car.image || null,
    badge: (car.badge === 'priceDrop' || car.badge === 'premium' || car.badge === 'selfListed'
      ? 'inspected'
      : car.badge) as ListingPublicDetail['badge'],
    inspected: car.inspected,
    // extended (best-effort mocks)
    exteriorColor: 'White Pearl',
    interiorColor: 'Black',
    drivetrain: 'awd',
    seats: 5,
    doors: 4,
    engineCc: 2500,
    cylinders: 4,
    gccSpec: true,
    previousOwners: 1,
    serviceHistory: true,
    accidentHistory: false,
    descriptionEn: null,
    descriptionAr: null,
    photos: car.image
      ? [
          { cdnUrl: car.image, sortOrder: 0, isHero: true },
          { cdnUrl: car.image, sortOrder: 1, isHero: false },
          { cdnUrl: car.image, sortOrder: 2, isHero: false },
          { cdnUrl: car.image, sortOrder: 3, isHero: false },
        ]
      : [],
    inspectionReport: car.inspected ? { overallScore: 92, inspectedAt: '2026-04-12T00:00:00Z' } : null,
    listedAt: '2026-05-01T00:00:00Z',
  };
}

function filterMock(query: PublicListingsQuery): ReadonlyArray<FeaturedCar> {
  let pool = FEATURED_CARS.slice();
  if (query.brand) pool = pool.filter((c) => c.brand === query.brand);
  if (query.body) pool = pool.filter((c) => c.body === query.body);
  if (query.budgetMaxFils !== undefined) {
    const maxKwd = query.budgetMaxFils / 1000;
    pool = pool.filter((c) => c.price <= maxKwd);
  }
  return pool.slice(0, query.pageSize ?? 8);
}
