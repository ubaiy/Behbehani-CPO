/**
 * MeDocumentsApiClient — authenticated customer document vault endpoint.
 *
 * Task v0.17 / MOBILE_API_CONTRACT.md v1.5.2-roadmap §3:
 *   GET /v1/public/me/documents?page=&pageSize=&kind=
 *
 * Response body is Zod-validated at the boundary — same pattern as
 * MeInspectionsApiClient (Task v0.16).
 *
 * IMPORTANT: Use the intercepted httpClient (auth + 401-refresh). The
 * /v1/public/me/* namespace is authenticated despite the "public" prefix.
 */

import type { AxiosInstance } from 'axios';
import {
  DocumentListResponseSchema,
  DocumentDetailResponseSchema,
  type DocumentListResponseDto,
  type DocumentDetailResponseDto,
  type DocumentKind,
} from '@behbehani-cpo/shared-types';

// ─── Client ───────────────────────────────────────────────────────────────────

export class MeDocumentsApiClient {
  /**
   * @param axios Intercepted AxiosInstance (httpClient). Auth header + 401-refresh
   *              are handled transparently by the request/response interceptors.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Lists the authenticated customer's documents (paginated, newest first).
   * GET /v1/public/me/documents?page=&pageSize=&kind=
   *
   * The /v1/public/me/* URL namespace is authenticated despite the "public"
   * prefix — this is the established convention across B's API surface.
   */
  async list(
    params: { page?: number; pageSize?: number; kind?: DocumentKind } = {},
  ): Promise<DocumentListResponseDto> {
    const queryParams: Record<string, unknown> = {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    };
    if (params.kind !== undefined) {
      queryParams['kind'] = params.kind;
    }
    const res = await this.axios.get<unknown>('/v1/public/me/documents', {
      params: queryParams,
    });
    return DocumentListResponseSchema.parse(res.data);
  }

  /**
   * Fetches a fresh 15-min signed S3 download URL for a single document.
   * GET /v1/public/me/documents/:id
   *
   * Called on tap — the list items do not carry a signedUrl; the detail
   * endpoint issues a fresh signed URL each time (15-min TTL per spec).
   */
  async getDownloadUrl(id: string): Promise<DocumentDetailResponseDto> {
    const res = await this.axios.get<unknown>(
      `/v1/public/me/documents/${encodeURIComponent(id)}`,
    );
    return DocumentDetailResponseSchema.parse(res.data);
  }
}
