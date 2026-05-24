/**
 * MeSavedListingsApiClient — authenticated saved-listings (favourites) endpoints.
 *
 * Wires to:
 *   GET    /v1/public/me/saved-listings
 *   POST   /v1/public/me/saved-listings/:listingId
 *   DELETE /v1/public/me/saved-listings/:listingId
 *
 * All responses are Zod-validated at the boundary.
 * Constructor accepts an AxiosInstance so the app-level http.ts singleton
 * (intercepted httpClient — auth + 401-refresh) is injected at boot time.
 *
 * Task v0.18.b / saved-listings.public.schemas.ts shapes.
 */

import type { AxiosInstance } from 'axios';
import {
  SavedListingListResponseSchema,
  type SavedListingListResponse,
} from '@behbehani-cpo/shared-types';

const BASE = '/v1/public/me/saved-listings';

export class MeSavedListingsApiClient {
  /**
   * @param axios Intercepted AxiosInstance (httpClient). Auth header + 401-refresh
   *              are handled transparently by the request/response interceptors.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Lists the authenticated customer's saved listings (favourites), paginated.
   * GET /v1/public/me/saved-listings?page=&pageSize=
   */
  async list(params: { page?: number; pageSize?: number } = {}): Promise<SavedListingListResponse> {
    const res = await this.axios.get<unknown>(BASE, {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      },
    });
    return SavedListingListResponseSchema.parse(res.data);
  }

  /**
   * Saves (favourites) a listing for the authenticated customer.
   * POST /v1/public/me/saved-listings/:listingId
   *
   * Idempotent — re-saving an already-saved listing returns {saved: false}.
   * Pass an idempotencyKey per attempt to prevent duplicate rows on retry.
   * Sent as the `Idempotency-Key` request header.
   */
  async add(listingId: string, idempotencyKey?: string): Promise<void> {
    await this.axios.post<unknown>(`${BASE}/${listingId}`, undefined, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
  }

  /**
   * Removes (unfavourites) a listing for the authenticated customer.
   * DELETE /v1/public/me/saved-listings/:listingId
   *
   * Idempotent — removing a non-existent entry returns {removed: false}.
   * Returns void on success.
   */
  async remove(listingId: string): Promise<void> {
    await this.axios.delete<unknown>(`${BASE}/${listingId}`);
  }
}
