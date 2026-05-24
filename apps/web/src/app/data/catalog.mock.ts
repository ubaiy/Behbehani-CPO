/**
 * v1.5-D11e — Catalog mocks PURGED per user. BRANDS (12 entries),
 * BODY_TYPES (7 entries), FEATURED_CARS (~10 entries) all deleted; the public
 * catalog is now strictly backend-driven (`PublicCatalogService` returns []
 * on empty/error rather than falling back to seeded mocks).
 *
 * Kept here: SERVICES, TESTIMONIALS, PRICE_BRACKETS — these are NOT mock
 * data, they're hardcoded VISUAL CONTENT for the home page sections (services
 * promo strip / customer reviews / price-bracket buttons). They render
 * directly to the UI and don't shadow any backend table.
 *
 * When/if these become editable (admin-managed services catalog, real
 * testimonials database, dynamic price ladders), move them to their own
 * services + delete from here.
 */
import type { ServiceItem, Testimonial } from './catalog.types';

export const SERVICES: ReadonlyArray<ServiceItem> = [
  { id: 'wash', iconKey: 'sparkle', fromPrice: 8 },
  { id: 'tint', iconKey: 'shield', fromPrice: 35 },
  { id: 'renewal', iconKey: 'doc', fromPrice: 25 },
  { id: 'tires', iconKey: 'car', fromPrice: 120 },
  { id: 'health', iconKey: 'check', fromPrice: 15 },
  { id: 'glass', iconKey: 'camera', fromPrice: 30 },
];

export const TESTIMONIALS: ReadonlyArray<Testimonial> = [
  { id: 'fatima', name: 'Fatima A.', car: 'Lexus RX 350', stars: 5 },
  { id: 'mohammad', name: 'Mohammad K.', car: 'Toyota Camry', stars: 5 },
  { id: 'sara', name: 'Sara M.', car: 'BMW X5', stars: 5 },
];

export const PRICE_BRACKETS: ReadonlyArray<{
  lo: number;
  hi: number;
  labelKey: 'under' | 'above';
  labelLiteral?: string;
}> = [
  { lo: 0, hi: 3000, labelKey: 'under' },
  { lo: 3000, hi: 6000, labelKey: 'under', labelLiteral: 'KWD 3K – 6K' },
  { lo: 6000, hi: 10000, labelKey: 'under', labelLiteral: 'KWD 6K – 10K' },
  { lo: 10000, hi: 15000, labelKey: 'under', labelLiteral: 'KWD 10K – 15K' },
  { lo: 15000, hi: 20000, labelKey: 'under', labelLiteral: 'KWD 15K – 20K' },
  { lo: 20000, hi: 999999, labelKey: 'above' },
];
