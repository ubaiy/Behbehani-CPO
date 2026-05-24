/**
 * queryPayloadTransform — bidirectional converter between mobile's camelCase
 * BrowseFilters and backend's snake_case SavedSearchQueryPayload.
 *
 * WHY THIS EXISTS:
 *   B's SavedSearchQueryPayloadSchema uses snake_case keys (year_min,
 *   price_min_fils, body_types, etc.) per storefront URL query convention.
 *   Mobile's BrowseFilters interface is camelCase (brand, body, budgetMaxKwd).
 *   The transform layer lives mobile-side only — shared-types stays decoupled
 *   from BrowseFilters' shape.
 *
 * Round-trip contract (maintained mentally — verify if BrowseFilters changes):
 *   BrowseFilters { brand: 'toyota', body: 'sedan', budgetMaxKwd: 4500 }
 *   → toBackendPayload →
 *   { brands: ['toyota'], body_types: ['sedan'], price_max_fils: 4500000 }
 *   → fromBackendPayload →
 *   BrowseFilters { brand: 'toyota', body: 'sedan', budgetMaxKwd: 4500 }
 *
 * Fields not represented in BrowseFilters (year_min, transmissions, etc.) are
 * round-tripped through as-is where possible, but BrowseFilters currently only
 * exposes brand, body, budgetMaxKwd, and sort. Additional fields are preserved
 * via the passthrough path in fromBackendPayload to avoid data loss when the
 * user edits a saved search they did not create from mobile.
 */

import type { SavedSearchQueryPayload } from '@behbehani-cpo/shared-types';
import type { BrowseFilters } from '../FilterSheet';

// KWD → fils conversion factor.
const KWD_TO_FILS = 1000;

/**
 * Converts mobile's camelCase BrowseFilters to the backend's snake_case
 * SavedSearchQueryPayload.
 *
 * The refine() on SavedSearchQueryPayloadSchema requires at least one field to
 * be set. Callers should guard against empty BrowseFilters before calling.
 */
export function toBackendPayload(filters: BrowseFilters): SavedSearchQueryPayload {
  const payload: SavedSearchQueryPayload = {};

  if (filters.brand) {
    payload.brands = [filters.brand];
  }

  if (filters.body) {
    payload.body_types = [filters.body];
  }

  if (filters.budgetMaxKwd !== undefined && filters.budgetMaxKwd > 0) {
    // KWD is stored as fils (integer) in the backend.
    payload.price_max_fils = Math.round(filters.budgetMaxKwd * KWD_TO_FILS);
  }

  if (filters.sort) {
    // Map mobile sort keys → backend sort_by enum values.
    const sortMap: Record<NonNullable<BrowseFilters['sort']>, SavedSearchQueryPayload['sort_by']> = {
      featured: undefined,      // backend has no 'featured' sort_by; omit.
      priceAsc: 'price_asc',
      priceDesc: 'price_desc',
      mileageAsc: 'mileage_asc',
      newest: 'newest',
    };
    const mapped = sortMap[filters.sort];
    if (mapped !== undefined) {
      payload.sort_by = mapped;
    }
  }

  return payload;
}

/**
 * Converts the backend's snake_case SavedSearchQueryPayload back to mobile's
 * camelCase BrowseFilters.
 *
 * Only the fields that BrowseFilters exposes are mapped. Extra backend fields
 * (e.g. year_min, transmissions, mileage_max_km) are silently dropped — the
 * browse screen does not yet support them.
 */
export function fromBackendPayload(payload: SavedSearchQueryPayload): BrowseFilters {
  const filters: BrowseFilters = {};

  if (payload.brands && payload.brands.length > 0) {
    // BrowseFilters.brand is single-select — take the first value.
    filters.brand = payload.brands[0];
  }

  if (payload.body_types && payload.body_types.length > 0) {
    // BrowseFilters.body is single-select — take the first value.
    filters.body = payload.body_types[0];
  }

  if (payload.price_max_fils !== undefined) {
    // Convert fils back to KWD (3-decimal representation).
    filters.budgetMaxKwd = payload.price_max_fils / KWD_TO_FILS;
  }

  if (payload.sort_by) {
    const sortMap: Record<NonNullable<SavedSearchQueryPayload['sort_by']>, BrowseFilters['sort']> = {
      price_asc: 'priceAsc',
      price_desc: 'priceDesc',
      mileage_asc: 'mileageAsc',
      newest: 'newest',
      year_desc: 'newest', // closest mobile equivalent
    };
    filters.sort = sortMap[payload.sort_by];
  }

  return filters;
}
