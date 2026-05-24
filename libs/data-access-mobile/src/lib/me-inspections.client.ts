/**
 * MeInspectionsApiClient — authenticated customer inspections list endpoint.
 *
 * Task v0.16 / MOBILE_API_CONTRACT.md v0.15-B-roadmap §2:
 *   GET /v1/public/me/inspections?page=&pageSize=
 *
 * IMPORTANT: This client is SEPARATE from InspectionsPublicApiClient
 * (libs/data-access-mobile/src/lib/inspections-public.client.ts) which wraps
 * rawHttpClient for the no-auth /v1/public/inspection-sign/:token route.
 * This client MUST use the intercepted httpClient (auth + 401-refresh).
 *
 * Response bodies are Zod-validated at the boundary — same pattern as
 * OrdersPublicApiClient (Task #65).
 */

import type { AxiosInstance } from 'axios';
import {
  CustomerInspectionListResponseSchema,
  type CustomerInspectionListResponse,
} from '@behbehani-cpo/shared-types';

// ─── Client ───────────────────────────────────────────────────────────────────

export class MeInspectionsApiClient {
  /**
   * @param axios Intercepted AxiosInstance (httpClient). Auth header + 401-refresh
   *              are handled transparently by the request/response interceptors.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Lists the authenticated customer's inspections (paginated, newest first).
   * GET /v1/public/me/inspections?page=&pageSize=
   *
   * The /v1/public/me/* URL namespace is authenticated despite the "public"
   * prefix — this is the established convention across B's API surface.
   */
  async list(params: { page?: number; pageSize?: number } = {}): Promise<CustomerInspectionListResponse> {
    const res = await this.axios.get<unknown>('/v1/public/me/inspections', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      },
    });
    return CustomerInspectionListResponseSchema.parse(res.data);
  }
}
