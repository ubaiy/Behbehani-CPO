import { randomUUID } from 'node:crypto';
import type { AdminRole, PublicUser, RegisterWithEmailDto, UserRole } from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './jwt';
import {
  createUser,
  findById,
  findByEmail,
  findByMobile,
  isGhostUser,
  isLocked,
  recordFailedLogin,
  resetFailedLogin,
  toPublic,
  upgradeGhostUser,
  verifyPassword,
  type UserRecord,
} from './users.repo';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: ReturnType<typeof toPublic>;
}

export class AuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

/**
 * Optional context passed through sign-in / register paths so we can record
 * the device session row. Per CONTRACT v1.3.0 §3.
 */
export interface SessionCtx {
  deviceLabel?: string | null;
  platform?: string | null;
  ip?: string | null;
}

/**
 * Mint an AuthSession for a UserRecord. Inserts a UserDeviceSession row with
 * the new refresh-token JTI per CONTRACT v1.3.0 §3.
 *
 * `ctx` is optional for backward compat — callers that have not yet been
 * updated to pass ctx will get a session row with NULL device fields.
 */
async function makeSession(user: UserRecord, ctx: SessionCtx = {}): Promise<AuthSession> {
  const jti = randomUUID();
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role as UserRole,
    adminRoles: (user.adminRoles ?? []) as AdminRole[],
    sessionJti: jti,
  });
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  // Record device session row — enables refresh rotation + reuse detection.
  await prisma.userDeviceSession.create({
    data: {
      userId: user.id,
      refreshTokenJti: jti,
      deviceLabel: ctx.deviceLabel ?? null,
      platform: ctx.platform ?? 'web',
      ipFirstSeen: ctx.ip ?? null,
      ipLastSeen: ctx.ip ?? null,
    },
  });

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: new Date(Date.now() + env.JWT_ACCESS_TTL_SEC * 1000).toISOString(),
    user: toPublic(user),
  };
}

export async function signInWithEmail(
  input: { email: string; password: string },
  ctx: SessionCtx = {},
): Promise<AuthSession> {
  const user = await findByEmail(input.email);
  if (!user) throw new AuthError(401, 'Invalid credentials');
  if (isLocked(user)) throw new AuthError(423, 'Account locked. Try again later.');

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    await recordFailedLogin(user);
    throw new AuthError(401, 'Invalid credentials');
  }
  const fresh = await resetFailedLogin(user);
  return makeSession(fresh, ctx);
}

export async function signInWithMobile(
  input: { mobile: string; password: string },
  ctx: SessionCtx = {},
): Promise<AuthSession> {
  const user = await findByMobile(input.mobile);
  if (!user) throw new AuthError(401, 'Invalid credentials');
  if (isLocked(user)) throw new AuthError(423, 'Account locked. Try again later.');
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    await recordFailedLogin(user);
    throw new AuthError(401, 'Invalid credentials');
  }
  const fresh = await resetFailedLogin(user);
  return makeSession(fresh, ctx);
}

/**
 * Mint a fresh session for an already-resolved customer (no password check).
 *
 * Used by post-verification flows where identity has already been established
 * via a side channel:
 *  - `verifyGoogleIdToken` resolves to a User row, controller calls this.
 *  - `verifyOtp` (purpose='signin') resolves to a userId, controller calls this.
 *  - Future: passwordless magic-link flows.
 *
 * Returns null if the user has been soft-deleted or never existed (controller
 * should map to 401). Throws AuthError(423) if the account is currently
 * locked from too many failed logins (mirrors signInWithEmail behaviour so a
 * locked user can't sidestep the lockout via OTP).
 *
 * Locked in CONCIERGE_INSPECTION_API_CONTRACT.md v1.2.4 §1 (replaces A's
 * inlined `mintSessionForUserId` workaround in auth-public.controller.ts).
 */
export async function issueSessionForUserId(
  userId: string,
  ctx: SessionCtx = {},
): Promise<AuthSession | null> {
  const user = await findById(userId);
  if (!user) return null;
  if (isLocked(user)) {
    throw new AuthError(423, 'Account locked. Try again later.');
  }
  // Reset failed-login counter — successful identity verification through a
  // side channel counts as a clean sign-in.
  const fresh = await resetFailedLogin(user);
  return makeSession(fresh, ctx);
}

/**
 * Refresh rotation with reuse-detection per CONTRACT v1.3.0 §3.
 *
 * Flow:
 *  1. Verify the refresh token → extract {sub, jti}.
 *  2. Look up UserDeviceSession by refreshTokenJti = jti.
 *  3. Not found → 401 TOKEN_INVALID.
 *  4. Found but revokedAt IS NOT NULL → REUSE DETECTED: revoke ALL sessions for
 *     the user (refreshTokenJti=NULL, revokedAt=now()). Return 401 TOKEN_REUSED.
 *  5. Normal rotation: revoke old row, mint new refresh token with new JTI,
 *     insert new UserDeviceSession row, return new session.
 */
export async function refresh(
  input: { refreshToken: string },
  ctx: SessionCtx = {},
): Promise<AuthSession> {
  let payload;
  try {
    payload = verifyRefreshToken(input.refreshToken);
  } catch {
    throw new AuthError(401, 'Invalid refresh token');
  }

  const session = await prisma.userDeviceSession.findUnique({
    where: { refreshTokenJti: payload.jti },
  });

  if (!session) {
    throw new AuthError(401, 'TOKEN_INVALID');
  }

  if (session.revokedAt !== null) {
    // Reuse detected — revoke ALL sessions for this user.
    await prisma.userDeviceSession.updateMany({
      where: { userId: payload.sub },
      data: { revokedAt: new Date(), refreshTokenJti: null },
    });
    // Using status 401 with a distinctive body code for the controller to surface.
    throw new AuthError(401, 'TOKEN_REUSED');
  }

  // Normal rotation: revoke old row.
  await prisma.userDeviceSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date(), refreshTokenJti: null },
  });

  const user = await findById(payload.sub);
  if (!user) throw new AuthError(401, 'Invalid refresh token');

  // Carry forward device fingerprint from the old session for continuity.
  const rotationCtx: SessionCtx = {
    deviceLabel: session.deviceLabel ?? ctx.deviceLabel ?? null,
    platform: session.platform ?? ctx.platform ?? 'web',
    ip: ctx.ip ?? session.ipLastSeen ?? null,
  };

  return makeSession(user, rotationCtx);
}

/**
 * Ghost-aware customer registration (CONTRACT v1.2.0 §1 Q2, v1.2.1 §4.4).
 *
 * Three branches:
 *  1. **Ghost upgrade** — existing User row with `passwordHash IS NULL`
 *     (created by `createGhostCustomer` during a Concierge booking). Upgrade
 *     in place: set password, set `mobileVerifiedAt`, refresh `fullName` if
 *     the new value is non-empty. Return `kind:'upgraded'` so the controller
 *     emits 200 and the frontend can render "Welcome back — we've linked
 *     your existing booking".
 *  2. **Claimed conflict** — existing User row with a password set. Reject
 *     with 409 `EMAIL_TAKEN_NON_GOOGLE` (the same code we'll use for the
 *     Google OAuth collision path in v1.2 — see §5 of the contract).
 *  3. **Fresh create** — no existing row. Create + return `kind:'created'`
 *     so the controller emits 201.
 *
 * In all success cases the response body is identical: `{user, session, kind}`.
 * The `kind` discriminator drives A's sign-up modal copy switch.
 */
export async function registerCustomer(
  dto: RegisterWithEmailDto,
  ctx: SessionCtx & { userAgent?: string | null } = {},
): Promise<{ user: PublicUser; session: AuthSession; kind: 'created' | 'upgraded' }> {
  // Lookup by email first, then mobile — either match triggers upgrade-or-409.
  const byEmail = dto.email ? await findByEmail(dto.email) : null;
  const byMobile = dto.mobile ? await findByMobile(dto.mobile) : null;
  const existing = byEmail ?? byMobile;

  // Cross-field collision guard: if email matches one row and mobile matches
  // a *different* row, neither can be cleanly upgraded — reject.
  if (byEmail && byMobile && byEmail.id !== byMobile.id) {
    throw new AuthError(409, 'EMAIL_TAKEN_NON_GOOGLE');
  }

  if (existing) {
    if (!isGhostUser(existing)) {
      throw new AuthError(409, 'EMAIL_TAKEN_NON_GOOGLE');
    }
    // Upgrade ghost in place.
    const upgraded = await upgradeGhostUser(existing.id, {
      password: dto.password,
      fullName: dto.fullName,
      markMobileVerified: Boolean(dto.mobile),
    });
    // Patch missing email/mobile if the ghost was created from only one
    // identifier and the new registration brings the other.
    const patchData: { email?: string; mobile?: string } = {};
    if (!upgraded.email && dto.email) patchData.email = dto.email;
    if (!upgraded.mobile && dto.mobile) patchData.mobile = dto.mobile;
    const final =
      Object.keys(patchData).length > 0
        ? await prisma.user.update({ where: { id: upgraded.id }, data: patchData })
        : upgraded;
    const session = await makeSession(final, ctx);
    return { user: session.user, session, kind: 'upgraded' };
  }

  // Fresh create.
  const created = await createUser({
    email: dto.email,
    mobile: dto.mobile ?? null,
    password: dto.password,
    fullName: dto.fullName,
  });
  const session = await makeSession(created, ctx);
  return { user: session.user, session, kind: 'created' };
}
