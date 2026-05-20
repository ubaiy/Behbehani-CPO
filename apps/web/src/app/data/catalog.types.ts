export type CarBadge =
  | 'inspected'
  | 'premium'
  | 'lowMileage'
  | 'priceDrop'
  | 'recentlyAdded'
  | 'selfListed';

export type SellerType = 'Platform' | 'Dealer' | 'Private';

export interface BrandRef {
  id: string;
  name: string;
  nameAr: string;
  domain: string;
}

export interface BodyTypeRef {
  id: string;
  name: string;
  nameAr: string;
}

export interface FeaturedCar {
  id: string;
  /** URL slug for routing to the VDP. Optional so the legacy mock dataset
      still type-checks; new mock entries should set it explicitly. */
  slug?: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  monthly: number;
  body: string;
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
