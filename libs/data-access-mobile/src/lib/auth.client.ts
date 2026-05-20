/**
 * AuthApiClient — thin axios wrapper for the Behbehani CPO auth surface.
 *
 * Endpoints:
 *   POST /v1/auth/login   → AuthSession
 *   POST /v1/auth/refresh → AuthSession
 *   GET  /v1/me           → PublicUser
 *
 * IMPORTANT: /login and /refresh must use a BYPASS axios instance that does NOT
 * have the 401-refresh interceptor attached. Passing the plain (non-intercepted)
 * axios instance from http.ts avoids infinite refresh loops. The intercepted
 * instance (`httpClient`) should NOT be passed to this client.
 *
 * All responses are validated with Zod at the boundary (§10, ARCHITECTURE.md).
 */

import type { AxiosInstance } from 'axios';
import { z } from 'zod';
import type {
  AuthSession,
  PublicUser,
  SignInWithEmailDto,
  SignInWithMobileDto,
  RefreshDto,
} from '@behbehani-cpo/shared-types';

// ─── Response validators ──────────────────────────────────────────────────────
// Inline Zod schemas that mirror the shared-types interfaces without importing
// them as schemas (the interfaces are sufficient since we validate structure).

const PublicUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  mobile: z.string().nullable(),
  fullName: z.string(),
  role: z.string(),
  adminRoles: z.array(z.string()),
  locale: z.enum(['en', 'ar']),
});

const AuthSessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresAt: z.string(),
  user: PublicUserSchema,
});

// ─── Client ───────────────────────────────────────────────────────────────────

export class AuthApiClient {
  /**
   * @param axios A configured AxiosInstance. For /login and /refresh this
   *   should be the RAW instance WITHOUT the 401-refresh interceptor to
   *   prevent circular refresh loops. See apps/mobile/src/services/http.ts.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Authenticates with email+password or mobile+password.
   * Returns a validated AuthSession on success.
   */
  async login(
    dto: SignInWithEmailDto | SignInWithMobileDto,
  ): Promise<AuthSession> {
    const res = await this.axios.post<unknown>('/v1/auth/login', dto);
    return AuthSessionSchema.parse(res.data) as AuthSession;
  }

  /**
   * Rotates the access token using the stored refresh token.
   * Returns a validated AuthSession on success.
   */
  async refresh(dto: RefreshDto): Promise<AuthSession> {
    const res = await this.axios.post<unknown>('/v1/auth/refresh', dto);
    return AuthSessionSchema.parse(res.data) as AuthSession;
  }

  /**
   * Returns the authenticated user's public profile.
   * Call with the INTERCEPTED httpClient — this endpoint requires a Bearer token.
   */
  async getMe(): Promise<PublicUser> {
    const res = await this.axios.get<unknown>('/v1/me');
    return PublicUserSchema.parse(res.data) as PublicUser;
  }
}
