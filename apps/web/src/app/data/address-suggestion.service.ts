import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Governorate =
  | 'capital'
  | 'hawalli'
  | 'farwaniya'
  | 'mubarakAlKabeer'
  | 'ahmadi'
  | 'jahra';

export interface AddressSuggestion {
  /** Display label, line 1 (street/block/house). */
  formatted: string;
  /** Display label, line 2 (area · governorate). */
  area: string;
  governorate: Governorate;
}

/**
 * Static KW seed used until Google Maps Places key is wired in.
 * Covers ~15 addresses across all 6 governorates so the typeahead has
 * meaningful coverage for QA + happy-path demos.
 */
const STATIC_SEED: ReadonlyArray<AddressSuggestion> = [
  // Hawalli governorate (Salmiya, Hawalli, Bayan, Salam, Salwa)
  { formatted: 'Block 4, Salem Al Mubarak St, House 12', area: 'Salmiya', governorate: 'hawalli' },
  { formatted: 'Block 10, Street 1, House 7', area: 'Salmiya', governorate: 'hawalli' },
  { formatted: 'Block 4, Street 12, Salem Al Sabah', area: 'Bayan', governorate: 'hawalli' },
  { formatted: 'Block 6, Tunis Street, Building 22', area: 'Hawalli', governorate: 'hawalli' },
  { formatted: 'Block 9, Street 3, House 41', area: 'Salwa', governorate: 'hawalli' },

  // Capital
  { formatted: 'Block 1, Khalid Bin Al Waleed St, Tower 5', area: 'Kuwait City', governorate: 'capital' },
  { formatted: 'Block 3, Ahmad Al Jaber St, House 14', area: 'Dasma', governorate: 'capital' },
  { formatted: 'Block 5, Istiqlal St, Villa 9', area: 'Shamiya', governorate: 'capital' },

  // Farwaniya
  { formatted: 'Block 2, Habib Munawer St, House 28', area: 'Farwaniya', governorate: 'farwaniya' },
  { formatted: 'Block 7, Street 100, Building 3', area: 'Jleeb Al Shuyoukh', governorate: 'farwaniya' },

  // Ahmadi
  { formatted: 'Block 4, 1st Avenue, House 17', area: 'Fahaheel', governorate: 'ahmadi' },
  { formatted: 'Block 8, Street 5, Villa 22', area: 'Mangaf', governorate: 'ahmadi' },

  // Jahra
  { formatted: 'Block 3, Street 11, House 6', area: 'Jahra', governorate: 'jahra' },
  { formatted: 'Block 6, Al Naseem St, House 19', area: 'Naseem', governorate: 'jahra' },

  // Mubarak Al Kabeer
  { formatted: 'Block 5, Street 2, House 8', area: 'Adan', governorate: 'mubarakAlKabeer' },
];

/**
 * Adapter interface — future Google Places implementation will satisfy
 * this same surface. Keep it tiny.
 */
export interface AddressSuggestionAdapter {
  search(query: string, maxResults?: number): Promise<AddressSuggestion[]>;
  reverseGeocode(lat: number, lng: number): Promise<AddressSuggestion | null>;
}

/**
 * Static-seed adapter. Always available; used as fallback when no API key
 * is configured. Matches case-insensitive substring on formatted+area+governorate.
 */
class StaticSeedAdapter implements AddressSuggestionAdapter {
  async search(query: string, maxResults = 5): Promise<AddressSuggestion[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return STATIC_SEED.filter(
      (s) =>
        s.formatted.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q) ||
        s.governorate.toLowerCase().includes(q),
    ).slice(0, maxResults);
  }

  async reverseGeocode(_lat: number, _lng: number): Promise<AddressSuggestion | null> {
    // Static adapter can't actually reverse-geocode; return the first KW seed
    // as a "best-guess" so the geolocation flow still produces something.
    return STATIC_SEED[0] ?? null;
  }
}

/**
 * Public service. Picks an adapter at runtime (SSR-safe). When Google Maps
 * Places becomes available (window.google.maps.places present), swap in a
 * real adapter — the public API stays unchanged.
 */
@Injectable({ providedIn: 'root' })
export class AddressSuggestionService implements AddressSuggestionAdapter {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly adapter: AddressSuggestionAdapter = new StaticSeedAdapter();

  /** True when running in a browser (used by geolocation gating). */
  isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  search(query: string, maxResults = 5): Promise<AddressSuggestion[]> {
    return this.adapter.search(query, maxResults);
  }

  reverseGeocode(lat: number, lng: number): Promise<AddressSuggestion | null> {
    return this.adapter.reverseGeocode(lat, lng);
  }
}
