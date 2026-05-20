/**
 * Google OAuth verifier — verifies a Google-issued ID token and resolves the
 * caller to a local User row (creating one if necessary).
 *
 * Contract: CONCIERGE_INSPECTION_API_CONTRACT.md v1.2.0 §1 Q5 / §4 / §5 +
 * v1.2.1 §4.5. Schema fields: `User.googleSub` (unique) + nullable
 * `passwordHash` to support OAuth-only accounts.
 *
 * NOTE: Live verification body is **deferred** until `google-auth-library@^9`
 * is installed in apps/api. The signature and error contract below are FINAL
 * — A's controller can wire against this today; the body will swap in
 * `OAuth2Client.verifyIdToken({ idToken, audience: env.GOOGLE_OAUTH_CLIENT_ID })`
 * + payload extraction within the day-1 window.
 *
 * Install command (gated on user, since `npm i` can EPERM on Windows with
 * the API dev server running):
 *
 *   cd apps/api && npm i google-auth-library@^9
 */

import type { Prisma, User } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';

/** Error codes mirror the v1.2.0 §5 locked envelope. Controller maps to HTTP. */
export type GoogleAuthErrorCode =
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'EMAIL_TAKEN_NON_GOOGLE'
  | 'NOT_IMPLEMENTED';

export class GoogleAuthError extends Error {
  constructor(public readonly code: GoogleAuthErrorCode, message: string) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

export interface VerifyGoogleResult {
  user: User;
  /** True when a fresh User row was created for this verification. */
  isNewAccount: boolean;
}

export interface GooglePayload {
  sub: string;             // stable Google account id
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  locale?: string;
}

/**
 * Verify a Google-issued ID token and resolve to a local User.
 *
 * Resolution order:
 *  1. Find User by googleSub → return (login).
 *  2. Find User by email:
 *     a. If exists + isGhostUser → bind googleSub + emailVerifiedAt, return.
 *     b. If exists + has passwordHash → reject `EMAIL_TAKEN_NON_GOOGLE`.
 *  3. Create fresh User with googleSub + passwordHash=null + emailVerifiedAt=now().
 *
 * @throws GoogleAuthError per code list.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  _ctx: { ip?: string | null; userAgent?: string | null } = {},
): Promise<VerifyGoogleResult> {
  if (!env.GOOGLE_OAUTH_CLIENT_ID) {
    throw new GoogleAuthError(
      'NOT_IMPLEMENTED',
      'Google OAuth is not configured on this server (GOOGLE_OAUTH_CLIENT_ID unset)',
    );
  }

  // ─── Live verification (deferred — needs google-auth-library install) ───
  // const client = new OAuth2Client(env.GOOGLE_OAUTH_CLIENT_ID);
  // let ticket;
  // try {
  //   ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_OAUTH_CLIENT_ID });
  // } catch (err) {
  //   const msg = err instanceof Error ? err.message : 'Unknown verifier error';
  //   if (msg.toLowerCase().includes('expired')) {
  //     throw new GoogleAuthError('TOKEN_EXPIRED', 'Google token has expired');
  //   }
  //   throw new GoogleAuthError('INVALID_TOKEN', 'Google did not sign this token');
  // }
  // const payload = ticket.getPayload();
  // if (!payload || !payload.sub || !payload.email) {
  //   throw new GoogleAuthError('INVALID_TOKEN', 'Google token payload incomplete');
  // }
  // if (payload.email_verified !== true) {
  //   throw new GoogleAuthError('INVALID_TOKEN', 'Google has not verified this email address');
  // }
  // return resolveOrCreateUser({
  //   sub: payload.sub,
  //   email: payload.email,
  //   emailVerified: payload.email_verified,
  //   name: payload.name,
  //   picture: payload.picture,
  //   locale: payload.locale,
  // });

  // Until the library is wired, return 501 so A's controller can already
  // construct the call site and the error envelope shape matches.
  void idToken;
  throw new GoogleAuthError(
    'NOT_IMPLEMENTED',
    'Google ID token verification not yet wired — pending `npm i google-auth-library` in apps/api',
  );
}

/**
 * Pure resolution function — given an already-validated Google payload, find
 * or create the local User. Exposed for unit-testing without round-tripping
 * Google's verifier.
 */
export async function resolveOrCreateUser(payload: GooglePayload): Promise<VerifyGoogleResult> {
  // 1. By googleSub
  const byGoogleSub = await prisma.user.findFirst({
    where: { googleSub: payload.sub, deletedAt: null },
  });
  if (byGoogleSub) {
    return { user: byGoogleSub, isNewAccount: false };
  }

  // 2. By email
  const byEmail = await prisma.user.findFirst({
    where: { email: { equals: payload.email, mode: 'insensitive' }, deletedAt: null },
  });
  if (byEmail) {
    if (byEmail.passwordHash !== null) {
      throw new GoogleAuthError(
        'EMAIL_TAKEN_NON_GOOGLE',
        'This email is already registered with a password — please sign in with email + password instead',
      );
    }
    // Ghost → bind googleSub + mark email verified.
    const upgraded = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleSub: payload.sub,
        emailVerifiedAt: new Date(),
        ...(payload.name && byEmail.fullName.length < 2 ? { fullName: payload.name } : {}),
      },
    });
    return { user: upgraded, isNewAccount: false };
  }

  // 3. Fresh create
  const data: Prisma.UserCreateInput = {
    email: payload.email,
    passwordHash: null,
    fullName: payload.name ?? payload.email.split('@')[0],
    role: 'customer',
    googleSub: payload.sub,
    emailVerifiedAt: new Date(),
    locale: payload.locale?.startsWith('ar') ? 'ar' : 'en',
  };
  const created = await prisma.user.create({ data });
  return { user: created, isNewAccount: true };
}

/** Maps GoogleAuthError → { status, body } for controller use. */
export function mapGoogleAuthErrorToHttp(
  err: GoogleAuthError,
): { status: number; body: { code: GoogleAuthErrorCode; error: string } } {
  const statusByCode: Record<GoogleAuthErrorCode, number> = {
    INVALID_TOKEN: 401,
    TOKEN_EXPIRED: 410,
    EMAIL_TAKEN_NON_GOOGLE: 409,
    NOT_IMPLEMENTED: 501,
  };
  return { status: statusByCode[err.code], body: { code: err.code, error: err.message } };
}
