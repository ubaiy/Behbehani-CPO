/**
 * ListingsPublicApiClient — axios wrapper for public listings endpoints.
 *
 * Endpoints:
 *   GET /v1/public/listings          → ListingPublicListResponse (paginated)
 *   GET /v1/public/listings/featured → ListingPublicListResponse (up to 8)
 *   GET /v1/public/listings/low-mileage → ListingPublicListResponse (up to 8)
 *   GET /v1/public/listings/:slug    → ListingPublicSummary (detail — typed inline)
 *
 * NOTE: "featured" and "low-mileage" are registered BEFORE /:slug in the API
 * router, so they are never treated as slugs. Safe to call directly.
 *
 * All responses are validated with Zod at the boundary (§10, ARCHITECTURE.md).
 * Callers receive parse-validated objects — contract drift surfaces at runtime
 * in dev builds rather than silently propagating wrong types.
 *
 * Cache-key conventions for react-query (wired in W2):
 *   ['listings', 'list', filter]   — paginated browse results
 *   ['listings', 'featured']       — home hero rail
 *   ['listings', 'low-mileage']    — low-mileage rail
 *   ['listings', 'detail', slug]   — VDP
 */

import type { AxiosInstance } from 'axios';
import {
  ListingPublicListResponseSchema,
  ListingPublicSummarySchema,
  type ListingPublicListResponse,
  type ListingPublicFilter,
  type ListingPublicSummary,
} from '@behbehani-cpo/shared-types';

// ─── Client ───────────────────────────────────────────────────────────────────

export class ListingsPublicApiClient {
  /**
   * @param axios The configured AxiosInstance from apps/mobile/src/services/http.ts.
   *   This client makes only unauthenticated GET requests, so either the plain or
   *   intercepted instance is acceptable here.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Fetches a paginated list of public listings with optional filters.
   *
   * @param filter Query parameters matching ListingPublicFilterSchema.
   *   Defaults: page=1, pageSize=12, sort='featured'.
   */
  async list(filter?: Partial<ListingPublicFilter>): Promise<ListingPublicListResponse> {
    const params: Record<string, unknown> = {
      page: filter?.page ?? 1,
      pageSize: filter?.pageSize ?? 12,
      sort: filter?.sort ?? 'featured',
    };

    if (filter?.brand) params['brand'] = filter.brand;
    if (filter?.body) params['body'] = filter.body;
    if (filter?.budgetMaxFils !== undefined) params['budgetMaxFils'] = filter.budgetMaxFils;

    const res = await this.axios.get<unknown>('/v1/public/listings', { params });
    return ListingPublicListResponseSchema.parse(res.data);
  }

  /**
   * Fetches the home-screen featured rail (up to 8 listings, inspected-first).
   * Re-fetch on app foreground resume (Cache-Control: public, max-age=300 on CDN).
   */
  async featured(): Promise<ListingPublicListResponse> {
    const res = await this.axios.get<unknown>('/v1/public/listings/featured');
    return ListingPublicListResponseSchema.parse(res.data);
  }

  /**
   * Fetches the low-mileage browse rail (up to 8 listings, ascending mileage).
   */
  async lowMileage(): Promise<ListingPublicListResponse> {
    const res = await this.axios.get<unknown>('/v1/public/listings/low-mileage');
    return ListingPublicListResponseSchema.parse(res.data);
  }

  /**
   * Fetches a single listing by its URL slug (VDP).
   *
   * @param slug URL-safe listing slug, e.g. "2022-toyota-camry-xle-0012"
   * @throws {AxiosError} 404 if slug is unknown or listing is not in 'listed' stage.
   */
  async getBySlug(slug: string): Promise<ListingPublicSummary> {
    const res = await this.axios.get<unknown>(`/v1/public/listings/${encodeURIComponent(slug)}`);
    // API returns ListingPublicSummary shape (or extended detail shape that is a superset)
    // We parse against the summary schema for now; extend when the detail schema lands in shared-types.
    return ListingPublicSummarySchema.parse(res.data);
  }
}
