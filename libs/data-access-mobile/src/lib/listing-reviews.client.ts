/**
 * ListingReviewsApiClient — public (no-auth) listing reviews endpoint.
 *
 * Task v0.19.c / MOBILE_API_CONTRACT.md v1.5.6 §3:
 *   GET /v1/public/listings/:id/reviews?page=&pageSize=  → ReviewListResponse
 *
 * IMPORTANT — auth invariant:
 *   The listing-reviews route is PUBLIC — it must NOT carry a Bearer token
 *   (or at minimum must not redirect on an absent token). The axios instance
 *   passed here must be rawHttpClient, NOT the intercepted httpClient.
 *   An absent token is expected and valid; the 401-refresh interceptor must
 *   NOT be triggered here. Same no-auth invariant pattern as
 *   OffersPublicApiClient and InspectionsPublicApiClient.
 *   See: apps/mobile/src/services/http.ts (listingReviewsApiClient singleton).
 *
 * Response includes averageRating + ratingHistogram for VDP rendering.
 */

import type { AxiosInstance } from 'axios';
import {
  ReviewListResponseSchema,
  type ReviewListResponse,
} from '@behbehani-cpo/shared-types';

// ─── Client ───────────────────────────────────────────────────────────────────

export class ListingReviewsApiClient {
  /**
   * @param axios A PLAIN (non-intercepted) AxiosInstance. This client must NOT
   *   trigger the 401-refresh interceptor because listing-review routes are
   *   unauthenticated — the absence of a Bearer token is expected and valid.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Lists reviews for a specific listing (public, no auth required).
   * GET /v1/public/listings/:id/reviews?page=&pageSize=
   *
   * Includes averageRating + ratingHistogram at the top of the response for
   * VDP aggregate rendering without a separate request.
   *
   * @param listingId  UUID of the listing.
   * @param params     Pagination — defaults: page=1, pageSize=20.
   */
  async listForListing(
    listingId: string,
    params: { page?: number; pageSize?: number } = {},
  ): Promise<ReviewListResponse> {
    const res = await this.axios.get<unknown>(
      `/v1/public/listings/${encodeURIComponent(listingId)}/reviews`,
      {
        params: {
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 20,
        },
      },
    );
    return ReviewListResponseSchema.parse(res.data);
  }
}
