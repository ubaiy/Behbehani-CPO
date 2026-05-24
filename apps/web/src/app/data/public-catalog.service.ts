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
  // ---- v1.5.16 rich-media fields (optional — null when listing has no completed media) ----
  /** Promotional walk-around video. `url`/`posterUrl` may be relative
   *  (`/static/demo-media/...` for demo content served by API) OR absolute
   *  (CDN/S3 for production). Consumers must resolve via `absUrl()`. */
  walkaroundVideo?: {
    url: string;
    mimeType: string;
    posterUrl: string | null;
    durationS: number | null;
  } | null;
  /** 360° exterior spin asset. `archiveUrl` may be a `video/mp4` (a single MP4
   *  of the rotation) OR `application/zip` (frame sequence). v1 frontend only
   *  renders the MP4 path; zip fallback shows a "coming soon" placeholder.
   *  May be relative — resolve via `absUrl()`. */
  spin360?: {
    archiveUrl: string;
    mimeType: string;
    frameCount: number | null;
  } | null;
}

/**
 * v1.5.16 rich-media URLs may be relative (`/static/demo-media/...`, served
 * by the API at its origin — NOT under `/v1`) or absolute (CDN/S3). This
 * helper prefixes relatives with the API origin (stripping the `/v1` suffix
 * from the configured baseUrl) and passes absolutes through.
 */
export function absUrl(u: string, apiBaseUrl: string): string {
  const origin = apiBaseUrl.replace(/\/v1\/?$/, '');
  return u.startsWith('/') ? `${origin}${u}` : u;
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

  /* v1.5-D11e — Featured + low-mileage rails now strictly backend-driven.
     If the backend returns empty or errors, the home page shows the empty
     state (the rails handle [] gracefully by collapsing). No frontend-injected
     mock cars. */
  private readonly featuredCache$ = this.http
    .get<ListingPublicListResponse>(`${this.listingsBase}/featured`)
    .pipe(
      map((res) => res.items.map(toFeaturedCar)),
      catchError(() => of([] as ReadonlyArray<FeaturedCar>)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  private readonly lowMileageCache$ = this.http
    .get<ListingPublicListResponse>(`${this.listingsBase}/low-mileage`)
    .pipe(
      map((res) => res.items.map(toFeaturedCar)),
      catchError(() => of([] as ReadonlyArray<FeaturedCar>)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  /* v1.5-D11d — Brands + body-types now strictly backend-driven per user.
     If the backend returns an empty list OR is unreachable, we return [] so
     ONLY admin-created catalog items render anywhere. Consumers (home brand
     grid / sell wizard / browse filter) treat empty as "no brands available
     yet — go seed the catalog in admin". No frontend-injected entries. */
  private readonly brandsCache$ = this.http
    .get<{ items: PublicCatalogBrand[] }>(`${this.catalogBase}/brands`)
    .pipe(
      map((res) => res.items ?? []),
      catchError(() => of([] as ReadonlyArray<PublicCatalogBrand>)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  private readonly bodyTypesCache$ = this.http
    .get<{ items: PublicCatalogBodyType[] }>(`${this.catalogBase}/body-types`)
    .pipe(
      map((res) => res.items ?? []),
      catchError(() => of([] as ReadonlyArray<PublicCatalogBodyType>)),
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
  /* v1.5-D11e — VDP detail strictly backend-driven. 404 / network error
     returns null; VDP page shows the not-found state. No buildMockDetail. */
  detail$(slug: string): Observable<ListingPublicDetail | null> {
    let cached = this.detailCache.get(slug);
    if (!cached) {
      cached = this.http.get<ListingPublicDetail>(`${this.listingsBase}/${slug}`).pipe(
        map((res) => res ?? null),
        catchError(() => of(null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.detailCache.set(slug, cached);
    }
    return cached;
  }

  /** Filtered list — fresh request each call (filter combinations are unbounded).
      v1.5-D11e: returns [] on error instead of filterMock. */
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
      catchError(() => of([] as ReadonlyArray<FeaturedCar>)),
    );
  }
}

/** v1.5-D11e: Convert API DTO → the FeaturedCar shape used by card components.
 *  Brand + body display names are populated from the rich API objects so card
 *  components don't need a separate catalog lookup (the old `BRANDS.find()`
 *  shim is gone — that was tied to the deleted mock data). */
function toFeaturedCar(item: ListingPublicSummary): FeaturedCar {
  return {
    id: item.id,
    slug: item.slug,
    brand: item.brand.slug,
    brandNameEn: item.brand.nameEn,
    brandNameAr: item.brand.nameAr,
    model: item.titleEn || `${item.model.nameEn}`,
    year: item.year,
    mileage: item.mileageKm,
    price: Math.round(Number(item.priceFils) / 1000),
    monthly: Math.round(Number(item.monthlyFils) / 1000),
    body: item.bodyType.slug,
    bodyNameEn: item.bodyType.nameEn,
    bodyNameAr: item.bodyType.nameAr,
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

/* v1.5-D11e: all MOCK_* fallbacks (MOCK_FEATURED, MOCK_LOW_MILEAGE, MOCK_BRANDS,
   MOCK_BODY_TYPES) + buildMockDetail + filterMock + deterministicCount REMOVED
   per user. Backend is now the sole source of truth for catalog data. Empty
   API responses surface as empty UI states (rails collapse, brand grid shows
   "no brands yet", VDP shows not-found). */
