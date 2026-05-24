/**
 * MeSavedSearchesApiClient — authenticated saved-search CRUD endpoints.
 *
 * v1.5.3 — wires to GET/POST/PATCH/DELETE /v1/public/me/saved-searches.
 *
 * All five methods Zod-validate their response at the boundary (same pattern
 * as MeInspectionsApiClient / OrdersPublicApiClient).
 *
 * Constructor accepts an AxiosInstance so the app-level http.ts singleton
 * (intercepted httpClient — auth + 401-refresh) is injected at boot time.
 */

import type { AxiosInstance } from 'axios';
import {
  SavedSearchDtoSchema,
  SavedSearchListResponseSchema,
  type SavedSearchDto,
  type SavedSearchListResponse,
  type CreateSavedSearchInput,
  type UpdateSavedSearchInput,
} from '@behbehani-cpo/shared-types';

const BASE = '/v1/public/me/saved-searches';

export class MeSavedSearchesApiClient {
  /**
   * @param axios Intercepted AxiosInstance (httpClient). Auth header + 401-refresh
   *              are handled transparently by the request/response interceptors.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Lists the authenticated customer's saved searches (paginated).
   * GET /v1/public/me/saved-searches?page=&pageSize=
   */
  async list(
    params: { page?: number; pageSize?: number } = {},
  ): Promise<SavedSearchListResponse> {
    const res = await this.axios.get<unknown>(BASE, {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      },
    });
    return SavedSearchListResponseSchema.parse(res.data);
  }

  /**
   * Fetches a single saved search by id.
   * GET /v1/public/me/saved-searches/:id
   */
  async getById(id: string): Promise<SavedSearchDto> {
    const res = await this.axios.get<unknown>(`${BASE}/${id}`);
    return SavedSearchDtoSchema.parse(res.data);
  }

  /**
   * Creates a new saved search.
   * POST /v1/public/me/saved-searches
   *
   * Pass an idempotencyKey per attempt to prevent duplicate creation on retry.
   * The key is sent as the `Idempotency-Key` request header.
   */
  async create(input: CreateSavedSearchInput, idempotencyKey?: string): Promise<SavedSearchDto> {
    const res = await this.axios.post<unknown>(BASE, input, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return SavedSearchDtoSchema.parse(res.data);
  }

  /**
   * Partially updates a saved search.
   * PATCH /v1/public/me/saved-searches/:id
   */
  async update(id: string, input: UpdateSavedSearchInput): Promise<SavedSearchDto> {
    const res = await this.axios.patch<unknown>(`${BASE}/${id}`, input);
    return SavedSearchDtoSchema.parse(res.data);
  }

  /**
   * Deletes a saved search.
   * DELETE /v1/public/me/saved-searches/:id
   *
   * Returns void — a 204 No Content response carries no parseable body.
   */
  async delete(id: string): Promise<void> {
    await this.axios.delete<unknown>(`${BASE}/${id}`);
  }
}
