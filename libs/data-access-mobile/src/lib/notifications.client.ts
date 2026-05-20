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
 * When @behbehani-cpo/shared-types publishes push-token.public.schemas.ts (v1.4 Day 1-2),
 * replace the inline Zod schema with the imported type.
 */

import type { AxiosInstance } from 'axios';
import { z } from 'zod';

// ─── Inline request schema (v1.4.2 §2 locked shape) ──────────────────────────
// TODO (v1.4 Day 1-2): Replace with import from @behbehani-cpo/shared-types
//   import { RegisterPushTokenSchema } from '@behbehani-cpo/shared-types';

const RegisterPushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
  deviceLabel: z.string().optional(),
});

type RegisterPushTokenDto = z.infer<typeof RegisterPushTokenSchema>;

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
  async registerPushToken(dto: RegisterPushTokenDto): Promise<void> {
    // Validate at the boundary — surface misconfigured callers early.
    const validated = RegisterPushTokenSchema.parse(dto);
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
