/**
 * MeMaintenanceApiClient — authenticated customer maintenance-request CRUD.
 *
 * Task v0.19.b / MOBILE_API_CONTRACT.md v1.5.6 §2:
 *   GET    /v1/public/me/maintenance-requests?page=&pageSize=&status=
 *   GET    /v1/public/me/maintenance-requests/:id
 *   POST   /v1/public/me/maintenance-requests  (Idempotency-Key header REQUIRED)
 *   PATCH  /v1/public/me/maintenance-requests/:id
 *   DELETE /v1/public/me/maintenance-requests/:id  → 204
 *
 * Mirrors MeInspectionsApiClient pattern — wraps httpClient, Zod-parses all
 * successful response bodies at the boundary.
 *
 * Governorate wire value is snake_case per B's Prisma enum (e.g. mubarak_al_kabeer).
 */

import type { AxiosInstance } from 'axios';
import {
  MaintenanceRequestDtoSchema,
  MaintenanceRequestListResponseSchema,
  type MaintenanceRequestDto,
  type MaintenanceRequestListResponse,
  type CreateMaintenanceRequestInput,
  type UpdateMaintenanceRequestInput,
} from '@behbehani-cpo/shared-types';

// ─── Client ───────────────────────────────────────────────────────────────────

export class MeMaintenanceApiClient {
  /**
   * @param axios Intercepted AxiosInstance (httpClient). Auth header + 401-refresh
   *              are handled transparently by the request/response interceptors.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Lists the authenticated customer's maintenance requests (paginated).
   * GET /v1/public/me/maintenance-requests?page=&pageSize=&status=
   *
   * status=open  → server returns pending_review | scheduled | in_progress
   * status=closed → server returns completed | cancelled
   * status omitted → all statuses
   */
  async list(params: {
    page?: number;
    pageSize?: number;
    status?: 'open' | 'closed';
  } = {}): Promise<MaintenanceRequestListResponse> {
    const res = await this.axios.get<unknown>('/v1/public/me/maintenance-requests', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        ...(params.status ? { status: params.status } : {}),
      },
    });
    return MaintenanceRequestListResponseSchema.parse(res.data);
  }

  /**
   * Fetches a single maintenance request by id.
   * GET /v1/public/me/maintenance-requests/:id
   */
  async getById(id: string): Promise<MaintenanceRequestDto> {
    const res = await this.axios.get<unknown>(
      `/v1/public/me/maintenance-requests/${id}`,
    );
    return MaintenanceRequestDtoSchema.parse(res.data);
  }

  /**
   * Creates a new maintenance request.
   * POST /v1/public/me/maintenance-requests
   *
   * Idempotency-Key header is REQUIRED per contract — caller must supply it.
   * Use newIdempotencyKey() from apps/mobile/src/components/orders/orders.utils.ts.
   *
   * Returns 201 MaintenanceRequestDto on success.
   */
  async create(
    input: CreateMaintenanceRequestInput,
    idempotencyKey: string,
  ): Promise<MaintenanceRequestDto> {
    const res = await this.axios.post<unknown>(
      '/v1/public/me/maintenance-requests',
      input,
      {
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
    return MaintenanceRequestDtoSchema.parse(res.data);
  }

  /**
   * Updates an existing maintenance request (customer-editable fields only).
   * PATCH /v1/public/me/maintenance-requests/:id
   */
  async update(
    id: string,
    input: UpdateMaintenanceRequestInput,
  ): Promise<MaintenanceRequestDto> {
    const res = await this.axios.patch<unknown>(
      `/v1/public/me/maintenance-requests/${id}`,
      input,
    );
    return MaintenanceRequestDtoSchema.parse(res.data);
  }

  /**
   * Cancels / deletes a maintenance request.
   * DELETE /v1/public/me/maintenance-requests/:id → 204 No Content
   */
  async delete(id: string): Promise<void> {
    await this.axios.delete(`/v1/public/me/maintenance-requests/${id}`);
  }
}
