/**
 * MeNotificationsApiClient — authenticated customer notifications inbox endpoints.
 *
 * Task v0.19.a / MOBILE_API_CONTRACT.md v1.5.6 §1:
 *   GET    /v1/public/me/notifications?page=&pageSize=&unreadOnly=
 *   GET    /v1/public/me/notifications/unread-count
 *   POST   /v1/public/me/notifications/:id/read   (idempotent)
 *   POST   /v1/public/me/notifications/read-all
 *   DELETE /v1/public/me/notifications/:id        (204)
 *
 * Response bodies are Zod-validated at the boundary — same pattern as
 * MeInspectionsApiClient (Task v0.16) and MeDocumentsApiClient (Task v0.17).
 *
 * IMPORTANT: Use the intercepted httpClient (auth + 401-refresh). The
 * /v1/public/me/* namespace is authenticated despite the "public" prefix.
 */

import type { AxiosInstance } from 'axios';
import {
  NotificationListResponseSchema,
  NotificationSummaryDtoSchema,
  UnreadCountResponseSchema,
  type NotificationListResponse,
  type NotificationSummaryDto,
  type UnreadCountResponse,
} from '@behbehani-cpo/shared-types';

// ─── Client ───────────────────────────────────────────────────────────────────

export class MeNotificationsApiClient {
  /**
   * @param axios Intercepted AxiosInstance (httpClient). Auth header + 401-refresh
   *              are handled transparently by the request/response interceptors.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Lists the authenticated customer's notifications (paginated, newest first).
   * GET /v1/public/me/notifications?page=&pageSize=&unreadOnly=
   *
   * title + body are pre-localised server-side per User.locale. Mobile MUST NOT
   * run them through t() — they come ready to display.
   */
  async list(params: {
    page?: number;
    pageSize?: number;
    unreadOnly?: boolean;
  } = {}): Promise<NotificationListResponse> {
    const res = await this.axios.get<unknown>('/v1/public/me/notifications', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        unreadOnly: params.unreadOnly ?? false,
      },
    });
    return NotificationListResponseSchema.parse(res.data);
  }

  /**
   * Returns the current unread notification count.
   * GET /v1/public/me/notifications/unread-count
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    const res = await this.axios.get<unknown>(
      '/v1/public/me/notifications/unread-count',
    );
    return UnreadCountResponseSchema.parse(res.data);
  }

  /**
   * Marks a single notification as read (idempotent).
   * POST /v1/public/me/notifications/:id/read
   * Returns current notification state whether already read or just marked read.
   */
  async markRead(id: string): Promise<NotificationSummaryDto> {
    const res = await this.axios.post<unknown>(
      `/v1/public/me/notifications/${encodeURIComponent(id)}/read`,
    );
    return NotificationSummaryDtoSchema.parse(res.data);
  }

  /**
   * Marks ALL unread notifications as read for the authenticated user.
   * POST /v1/public/me/notifications/read-all
   * Returns { updated: number } — count of notifications that were updated.
   */
  async markAllRead(): Promise<{ updated: number }> {
    const res = await this.axios.post<unknown>(
      '/v1/public/me/notifications/read-all',
    );
    const data = res.data as { updated: number };
    return { updated: data.updated };
  }

  /**
   * Deletes a single notification permanently.
   * DELETE /v1/public/me/notifications/:id → 204 No Content
   */
  async delete(id: string): Promise<void> {
    await this.axios.delete(
      `/v1/public/me/notifications/${encodeURIComponent(id)}`,
    );
  }
}
