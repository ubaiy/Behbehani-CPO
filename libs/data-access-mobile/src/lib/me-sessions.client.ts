/**
 * MeSessionsApiClient — authenticated active-sessions endpoints.
 *
 * Task v0.22.a / MOBILE_API_CONTRACT.md v1.5.x §session-management:
 *   GET    /v1/public/me/sessions          — list active sessions
 *   DELETE /v1/public/me/sessions/:id      — revoke a single session
 *   POST   /v1/public/me/sign-out-all      — revoke all other sessions
 *
 * Sessions schemas are defined locally (not yet in shared-types) mirroring
 * the web SecurityService shape confirmed in apps/web/src/app/data/security.service.ts.
 * The SignOutAllResponseDto IS in shared-types (revoked: number).
 *
 * All responses are Zod-validated at the boundary — same pattern as other
 * me-* clients (MeNotificationsApiClient, MeMaintenanceApiClient, etc.).
 *
 * IMPORTANT: Use the intercepted httpClient (auth + 401-refresh). The
 * /v1/public/me/* namespace is authenticated despite the "public" prefix.
 */

import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import {
  SignOutAllResponseSchema,
  type SignOutAllResponseDto,
} from '@behbehani-cpo/shared-types';

// ─── Local session schemas (not yet in shared-types) ─────────────────────────

export const SessionSummarySchema = z.object({
  /** Opaque session ID — used as the revoke target. */
  id: z.string(),
  /** Human-readable device label, e.g. "iPhone 15 / Safari". */
  deviceLabel: z.string().optional().nullable(),
  /** IPv4/IPv6 address at login time. */
  ipAddress: z.string().optional().nullable(),
  /** ISO-8601 — last activity timestamp. */
  lastActiveAt: z.string().datetime().optional().nullable(),
  /** ISO-8601 — when the session was created. */
  createdAt: z.string().datetime().optional().nullable(),
  /** True for the session that made this request. */
  isCurrent: z.boolean(),
});
export type SessionSummaryDto = z.infer<typeof SessionSummarySchema>;

export const SessionListResponseSchema = z.object({
  items: z.array(SessionSummarySchema),
  total: z.number().int().nonnegative(),
});
export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;

// ─── Client ───────────────────────────────────────────────────────────────────

export class MeSessionsApiClient {
  /**
   * @param axios Intercepted AxiosInstance (httpClient). Auth header + 401-refresh
   *              are handled transparently by the request/response interceptors.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Lists all active sessions for the authenticated user.
   * GET /v1/public/me/sessions
   */
  async list(): Promise<SessionListResponse> {
    const res = await this.axios.get<unknown>('/v1/public/me/sessions');
    return SessionListResponseSchema.parse(res.data);
  }

  /**
   * Revokes (deletes) a single session by ID.
   * DELETE /v1/public/me/sessions/:id → 204 No Content
   */
  async revoke(id: string): Promise<void> {
    await this.axios.delete<unknown>(
      `/v1/public/me/sessions/${encodeURIComponent(id)}`,
    );
  }

  /**
   * Signs out all sessions EXCEPT the current one.
   * POST /v1/public/me/sign-out-all
   * Returns { revoked: number } — count of sessions invalidated.
   */
  async signOutAll(): Promise<SignOutAllResponseDto> {
    const res = await this.axios.post<unknown>('/v1/public/me/sign-out-all', null);
    return SignOutAllResponseSchema.parse(res.data);
  }
}
