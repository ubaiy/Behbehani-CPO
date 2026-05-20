/**
 * OTP service — issuance + verification for customer auth flows.
 *
 * Contract: CONCIERGE_INSPECTION_API_CONTRACT.md v1.2.0 §1 + §5 + v1.2.1 §4.3.
 * Decisions:
 *   - 6-digit numeric code, bcrypt-hashed (rounds=8 — cheap, 5-min TTL).
 *   - 5-minute TTL by default (env.OTP_TTL_MINUTES).
 *   - 5-attempt cap → OTP_LOCKED (the 6th attempt rejects even on correct code,
 *     forces a fresh resend).
 *   - 60-second resend cooldown enforced via `OtpCode.lastSentAt` (no Redis).
 *   - Multiple concurrent live OTPs per identifier are tolerated — newest is
 *     accepted; older ones expire naturally.
 *   - First-time registration: userId is NULL on the OtpCode row (no User
 *     exists yet). Verifier returns `userId: null` and the controller resolves
 *     the identity itself.
 *
 * Notifications: dispatched via `notifications/otp-notifications.service.ts`
 * (same SMS/email provider pattern as the inspection signing flow).
 */

import bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import type { OtpChannel, OtpPurpose } from '@prisma/client';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { sendOtpNotification } from '../notifications/otp-notifications.service';

const OTP_BCRYPT_ROUNDS = 8;
const OTP_TTL_MINUTES = env.OTP_TTL_MINUTES;
const OTP_RESEND_COOLDOWN_SEC = 60;
const OTP_MAX_ATTEMPTS = 5;

/** Error codes mirror the v1.2.0 §5 locked envelope. Controller maps to HTTP. */
export type OtpErrorCode =
  | 'OTP_NOT_FOUND'
  | 'OTP_EXPIRED'
  | 'OTP_LOCKED'
  | 'OTP_INCORRECT'
  | 'OTP_ALREADY_USED'
  | 'OTP_RATE_LIMITED';

export class OtpError extends Error {
  constructor(public readonly code: OtpErrorCode, message: string) {
    super(message);
    this.name = 'OtpError';
  }
}

export interface OtpContext {
  ip?: string | null;
  userAgent?: string | null;
  /** Set when the OTP is bound to an existing User (signin, mobile_verify). */
  userId?: string | null;
}

export interface IssueOtpResult {
  otpId: string;
  expiresAt: string; // ISO-8601
}

export interface VerifyOtpResult {
  otpId: string;
  /** Null when this OTP was a first-time registration (no User existed yet). */
  userId: string | null;
}

function generateCode(): string {
  // 6-digit zero-padded numeric code. `randomInt` keeps the distribution
  // uniform (vs Math.random() bias near the top of the range).
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

/**
 * Issue a fresh OTP. Enforces a 60-second resend cooldown against the most
 * recent live row for (identifier, purpose).
 *
 * Throws `OtpError('OTP_RATE_LIMITED')` if a row was sent within the last 60s.
 */
export async function issueOtp(
  identifier: string,
  channel: OtpChannel,
  purpose: OtpPurpose,
  ctx: OtpContext = {},
): Promise<IssueOtpResult> {
  // Rate-gate against the most recent issuance for this identifier+purpose.
  const recent = await prisma.otpCode.findFirst({
    where: { identifier, purpose },
    orderBy: { createdAt: 'desc' },
    select: { lastSentAt: true, createdAt: true },
  });
  if (recent) {
    const lastSent = recent.lastSentAt ?? recent.createdAt;
    const elapsedSec = (Date.now() - lastSent.getTime()) / 1000;
    if (elapsedSec < OTP_RESEND_COOLDOWN_SEC) {
      throw new OtpError(
        'OTP_RATE_LIMITED',
        `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SEC - elapsedSec)} seconds before requesting another code`,
      );
    }
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, OTP_BCRYPT_ROUNDS);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60_000);

  const row = await prisma.otpCode.create({
    data: {
      identifier,
      channel,
      purpose,
      codeHash,
      userId: ctx.userId ?? null,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      expiresAt,
      lastSentAt: now,
    },
    select: { id: true, expiresAt: true },
  });

  // Fire-and-await — failure to dispatch should still throw so the controller
  // can return 502 rather than telling the user the code was sent. We don't
  // surface the raw code; the notification service formats the body.
  await sendOtpNotification({ identifier, channel, code, ttlMinutes: OTP_TTL_MINUTES });

  return { otpId: row.id, expiresAt: row.expiresAt.toISOString() };
}

/**
 * Verify a 6-digit code against the most recent live row for
 * (identifier, purpose). On success the row is marked consumed.
 *
 * Throws:
 *  - `OTP_NOT_FOUND` — no live row at all (never issued or already consumed +
 *    no newer one). 404.
 *  - `OTP_EXPIRED` — row exists but `expiresAt` past. 410.
 *  - `OTP_ALREADY_USED` — row exists, code matches, but `consumedAt` set. 409.
 *  - `OTP_LOCKED` — attempts already at 5+; even correct code is rejected. 429.
 *  - `OTP_INCORRECT` — wrong code; attempts increments (allows retry until lock).
 */
export async function verifyOtp(
  identifier: string,
  channel: OtpChannel,
  purpose: OtpPurpose,
  code: string,
  _ctx: OtpContext = {},
): Promise<VerifyOtpResult> {
  // Strict match on channel too — an SMS OTP shouldn't satisfy an email purpose.
  const row = await prisma.otpCode.findFirst({
    where: { identifier, channel, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!row) {
    // Distinguish ALREADY_USED from NOT_FOUND: peek for any row (consumed or
    // not) with this code-hash. If a consumed match exists, the user is
    // re-submitting a previously-used code.
    const anyConsumed = await prisma.otpCode.findFirst({
      where: { identifier, channel, purpose, consumedAt: { not: null } },
      orderBy: { consumedAt: 'desc' },
    });
    if (anyConsumed && (await bcrypt.compare(code, anyConsumed.codeHash))) {
      throw new OtpError('OTP_ALREADY_USED', 'This code has already been used');
    }
    throw new OtpError('OTP_NOT_FOUND', 'No verification code found for this identifier');
  }

  if (isExpired(row.expiresAt)) {
    throw new OtpError('OTP_EXPIRED', 'Verification code has expired');
  }

  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    throw new OtpError('OTP_LOCKED', 'Too many incorrect attempts — please request a new code');
  }

  const ok = await bcrypt.compare(code, row.codeHash);
  if (!ok) {
    // Increment attempts; if this push reaches the cap, future calls hit OTP_LOCKED.
    await prisma.otpCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    throw new OtpError('OTP_INCORRECT', 'Incorrect verification code');
  }

  // Resolve userId for passwordless signin OTPs that were issued without a
  // bound userId (e.g. when the OTP was sent before the User row was known).
  // CONTRACT v1.3.0 §1 — look up by identifier so the controller receives a
  // non-null userId and can skip its own user-lookup.
  let resolvedUserId: string | null = row.userId ?? null;
  if (purpose === 'signin' && !row.userId) {
    const userLookup =
      channel === 'sms'
        ? await prisma.user.findUnique({ where: { mobile: identifier }, select: { id: true } })
        : await prisma.user.findUnique({ where: { email: identifier }, select: { id: true } });
    resolvedUserId = userLookup?.id ?? null;
  }

  // Consume the row — single-use semantic.
  await prisma.otpCode.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });

  return { otpId: row.id, userId: resolvedUserId };
}

/** Maps OtpError → { status, body } for controller use. */
export function mapOtpErrorToHttp(err: OtpError): { status: number; body: { code: OtpErrorCode; error: string } } {
  const statusByCode: Record<OtpErrorCode, number> = {
    OTP_NOT_FOUND: 404,
    OTP_EXPIRED: 410,
    OTP_LOCKED: 429,
    OTP_INCORRECT: 401,
    OTP_ALREADY_USED: 409,
    OTP_RATE_LIMITED: 429,
  };
  return { status: statusByCode[err.code], body: { code: err.code, error: err.message } };
}
