/**
 * MeNotificationPrefsApiClient — authenticated notification-preferences endpoints.
 *
 * Task v0.22.a / CONCIERGE_INSPECTION_API_CONTRACT.md v1.3.0 §6.1:
 *   GET   /v1/public/me/notification-preferences
 *   PATCH /v1/public/me/notification-preferences
 *
 * Schemas are imported from @behbehani-cpo/shared-types (NotificationPreferencesSchema,
 * NotificationPreferencesDto — defined in libs/shared/types/src/lib/me-account.schemas.ts).
 *
 * Note on PATCH: the endpoint accepts a partial or full NotificationPreferences body.
 * We send the full shape because the per-cell toggle grid always collapses to a full
 * DTO before sending — partial sends are not needed here.
 *
 * IMPORTANT: Use the intercepted httpClient (auth + 401-refresh). The
 * /v1/public/me/* namespace is authenticated despite the "public" prefix.
 */

import type { AxiosInstance } from 'axios';
import {
  NotificationPreferencesSchema,
  type NotificationPreferencesDto,
} from '@behbehani-cpo/shared-types';

// ─── Update input type ────────────────────────────────────────────────────────

/**
 * Input for PATCH /v1/public/me/notification-preferences.
 * Mirrors NotificationPreferencesDto — accountSecurity must always be true
 * (the schema enforces z.literal(true) server-side).
 */
export type UpdateNotificationPrefsInput = NotificationPreferencesDto;

// ─── Client ───────────────────────────────────────────────────────────────────

export class MeNotificationPrefsApiClient {
  /**
   * @param axios Intercepted AxiosInstance (httpClient). Auth header + 401-refresh
   *              are handled transparently by the request/response interceptors.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Fetches the authenticated customer's notification preferences.
   * GET /v1/public/me/notification-preferences
   *
   * Returns DEFAULT_NOTIFICATION_PREFERENCES shape when the server returns null
   * (no preferences saved yet — the server handles this and returns defaults).
   */
  async get(): Promise<NotificationPreferencesDto> {
    const res = await this.axios.get<unknown>(
      '/v1/public/me/notification-preferences',
    );
    return NotificationPreferencesSchema.parse(res.data);
  }

  /**
   * Partially/fully updates notification preferences.
   * PATCH /v1/public/me/notification-preferences
   *
   * Returns the updated NotificationPreferencesDto from the server.
   * accountSecurity is always true — the schema enforces this.
   */
  async update(
    input: UpdateNotificationPrefsInput,
  ): Promise<NotificationPreferencesDto> {
    const res = await this.axios.patch<unknown>(
      '/v1/public/me/notification-preferences',
      input,
    );
    return NotificationPreferencesSchema.parse(res.data);
  }
}
