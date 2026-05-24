export type CarBadge =
  | 'inspected'
  | 'premium'
  | 'lowMileage'
  | 'priceDrop'
  | 'recentlyAdded'
  | 'selfListed';

export type SellerType = 'Platform' | 'Dealer' | 'Private';

/* v1.5-D11d: BrandRef + BodyTypeRef removed alongside the catalog.mock data.
   Components that need brand/body display names now consume them from the
   PublicCatalogBrand / PublicCatalogBodyType shapes (apis from shared-types)
   via PublicCatalogService, OR from the per-card brandNameEn/Ar fields below
   that toFeaturedCar() populates from the API response. */

export interface FeaturedCar {
  id: string;
  /** URL slug for routing to the VDP. */
  slug?: string;
  /** Brand SLUG (e.g. "bmw"). Kept for filter matching. */
  brand: string;
  /** v1.5-D11d: pre-populated brand display name from the API response so
      card components don't need a separate catalog lookup. Falls back to slug
      if absent. */
  brandNameEn?: string;
  brandNameAr?: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  monthly: number;
  /** Body type SLUG. */
  body: string;
  /** v1.5-D11d: pre-populated body display names from the API response. */
  bodyNameEn?: string;
  bodyNameAr?: string;
  transmission: string;
  fuel: string;
  sellerType: SellerType;
  inspected: boolean;
  badge: CarBadge;
  image: string;
  fallbackColor: string;
}

export interface ServiceItem {
  id: string;
  iconKey: string;
  fromPrice: number;
}

export interface Testimonial {
  id: string;
  name: string;
  car: string;
  stars: number;
}
