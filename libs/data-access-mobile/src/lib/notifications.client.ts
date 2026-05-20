/**
 * NotificationsPublicApiClient — push token registration for Behbehani CPO mobile.
 *
 * Endpoints (v1.4.2 §2 LOCKED shape):
 *   POST   /v1/public/notifications/push-token
 *            body: { token: string, platform: 'ios'|'android', deviceLabel?: string }
 *            → 201 (created) or 200 (already-registered; updates lastSeenAt)
 *   DELETE /v1/public/notifications/push-token/:token
 *            → 204 (silent — idempotent on unknown tokens per v1.4.3 §4)
 *
 * Auth: requireCustomerSession (Bearer accessToken) on both endpoints.
 *
 * Per B v0.10-B-reply §B-C-5: canonical schema lives in shared-types as
 * `PushTokenInputSchema` (token: z.string().min(20).max(512); accommodates
 * APNs ~64-char hex tokens and FCM ~163-char tokens).
 */

import type { AxiosInstance } from 'axios';
import {
  PushTokenInputSchema,
  type PushTokenInputDto,
} from '@behbehani-cpo/shared-types';

// ─── Client ───────────────────────────────────────────────────────────────────

export class NotificationsPublicApiClient {
  /**
   * @param axios The authenticated (intercepted) AxiosInstance from http.ts.
   *   Both POST and DELETE endpoints require a valid Bearer accessToken
   *   (requireCustomerSession). Pass `httpClient` — not `rawHttpClient`.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Registers (or upserts) a device push token for the authenticated user.
   * Returns 201 on first registration, 200 if already registered (lastSeenAt updated).
   * Safe to call on every sign-in — the server deduplicates on the token value.
   *
   * @throws If the request body fails Zod validation (programming error; not a network error).
   * @throws If the network request fails — callers must treat push registration as best-effort.
   */
  async registerPushToken(dto: PushTokenInputDto): Promise<void> {
    // Validate at the boundary — surface misconfigured callers early.
    const validated = PushTokenInputSchema.parse(dto);
    await this.axios.post('/v1/public/notifications/push-token', validated);
  }

  /**
   * Unregisters a device push token for the authenticated user (sign-out flow).
   * DELETE is idempotent — 204 is returned whether the token existed or not (v1.4.3 §4).
   * Callers should treat failures as non-fatal (best-effort cleanup).
   *
   * @param token The exact push token string returned by the platform at registration time.
   */
  async unregisterPushToken(token: string): Promise<void> {
    await this.axios.delete(
      `/v1/public/notifications/push-token/${encodeURIComponent(token)}`,
    );
  }
}
