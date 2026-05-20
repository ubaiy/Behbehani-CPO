/**
 * Shared types for VDP sub-components.
 *
 * v0.10 — local ListingDetail interface DROPPED. We now import the canonical
 * PublicListingDetailDto from @behbehani-cpo/shared-types (shipped by A in
 * CONCIERGE v1.4.5 §6 closing [ASK C→A] A-2). Sub-components keep importing
 * `ListingDetail` from this file via the alias below — non-breaking.
 */

import type { PublicListingDetailDto } from '@behbehani-cpo/shared-types';

/** Alias for backward-compat. New code may import PublicListingDetailDto directly. */
export type ListingDetail = PublicListingDetailDto;

/** Re-exposed for any sub-component that imported InspectionCategory locally. */
export interface InspectionCategory {
  name: string;
  score: number;
  maxScore: number;
}
