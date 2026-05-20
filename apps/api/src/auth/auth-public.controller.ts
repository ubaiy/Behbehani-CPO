/**
 * Public auth endpoints — mounted in app.ts at /v1/auth.
 *
 *   POST /v1/auth/google/verify   — verify Google OAuth idToken, mint session
 *   POST /v1/auth/otp/issue       — request OTP (sms/email) for any purpose
 *   POST /v1/auth/otp/verify      — submit OTP code; on signin purpose, mint session
 *
 * Per v1.2.1: Google verify returns 501 NOT_IMPLEMENTED until `npm i
 * google-auth-library@^9` is run; controller surface is final.
 *
 * Status codes (locked in v1.2.0 §5):
 *   INVALID_TOKEN          → 401
 *   TOKEN_EXPIRED          → 410
 *   EMAIL_TAKEN_NON_GOOGLE → 409
 *   OTP_NOT_FOUND          → 404
 *   OTP_EXPIRED            → 410
 *   OTP_LOCKED             → 429
 *   OTP_INCORRECT          → 401
 *   OTP_ALREADY_USED       → 409
 *   OTP_RATE_LIMITED       → 429
 *   NOT_IMPLEMENTED        → 501 (Google body deferred to library install)
 *
 * v1.3.0 §3: All issueSessionForUserId calls pass ctx {deviceLabel, platform, ip}
 * so UserDeviceSession rows are created with device fingerprint.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { AuthError, issueSessionForUserId } from './auth.service';
import {
  GoogleAuthError,
  mapGoogleAuthErrorToHttp,
  verifyGoogleIdToken,
} from './google.service';
import { OtpError, issueOtp, mapOtpErrorToHttp, verifyOtp } from './otp.service';

export const authPublicRouter = Router();

const authMutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// ─── Inline Zod schemas ────────────────────────────────────────────────────
// The legacy auth.schemas.ts RequestOtp/VerifyOtp schemas use a different
// shape (mobile-only, purpose enum mismatch). These v1.2 schemas align with
// B's otp.service.ts signature. If B promotes them to shared-types in a
// future cleanup pass, A can swap the inline defs for imports.

const OtpChannelSchema = z.enum(['sms', 'email']);
// NOTE: 'email_change' and 'mobile_change' are intentionally excluded here.
// Those purposes require an authenticated me-account session and are handled
// by POST /v1/public/me/email and POST /v1/public/me/mobile respectively,
// preventing anonymous spam issuance to existing customer email/mobile addresses.
const OtpPurposeSchema = z.enum(['registration', 'signin', 'mobile_verify', 'password_reset']);

const IssueOtpRequestSchema = z.object({
  identifier: z.string().min(3).max(120),
  channel: OtpChannelSchema,
  purpose: OtpPurposeSchema,
});

const VerifyOtpRequestSchema = z.object({
  identifier: z.string().min(3).max(120),
  channel: OtpChannelSchema,
  purpose: OtpPurposeSchema,
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

const GoogleVerifyRequestSchema = z.object({
  idToken: z.string().min(20),
});

// ─── POST /v1/auth/google/verify ──────────────────────────────────────────
// Body: { idToken: string }
// On success: 200 { user, session, isNewAccount:false } or 201 { ..., isNewAccount:true }.
// 501 NOT_IMPLEMENTED until the google-auth-library install lands.

authPublicRouter.post('/google/verify', authMutationLimiter, async (req, res, next) => {
  try {
    const { idToken } = GoogleVerifyRequestSchema.parse(req.body);
    const { user, isNewAccount } = await verifyGoogleIdToken(idToken, {
      ip: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
    const session = await issueSessionForUserId(user.id, {
      ip: req.ip ?? null,
      deviceLabel: req.get('user-agent') ?? null,
      platform: 'web',
    });
    if (!session) {
      // User was created/found by the verifier but lookup failed — defensive.
      res.status(500).json({ code: 'INTERNAL_ERROR', error: 'Failed to mint session for Google user' });
      return;
    }
    res.status(isNewAccount ? 201 : 200).json({
      user: session.user,
      session,
      isNewAccount,
    });
  } catch (err) {
    if (err instanceof GoogleAuthError) {
      const { status, body } = mapGoogleAuthErrorToHttp(err);
      res.status(status).json(body);
      return;
    }
    next(err);
  }
});

// ─── POST /v1/auth/otp/issue ───────────────────────────────────────────────
// Body: { identifier: string, channel: 'sms'|'email', purpose: enum }
// 200 { otpId, expiresAt }
// 429 OTP_RATE_LIMITED on resend < 60s.

authPublicRouter.post('/otp/issue', authMutationLimiter, async (req, res, next) => {
  try {
    const dto = IssueOtpRequestSchema.parse(req.body);
    const result = await issueOtp(dto.identifier, dto.channel, dto.purpose, {
      ip: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof OtpError) {
      const { status, body } = mapOtpErrorToHttp(err);
      res.status(status).json(body);
      return;
    }
    next(err);
  }
});

// ─── POST /v1/auth/otp/verify ──────────────────────────────────────────────
// Body: { identifier, channel, purpose, code }
// Response branches on purpose:
//   - 'signin'                      → 200 { user, session, otpId } (session minted)
//   - 'registration'|'mobile_verify' → 200 { otpId, userId|null } (caller uses otpId
//                                       to complete registration via /auth/register)
//   - 'password_reset'              → 200 { otpId, userId } (caller uses otpId to set new password — flow not in v1.2)

authPublicRouter.post('/otp/verify', authMutationLimiter, async (req, res, next) => {
  try {
    const dto = VerifyOtpRequestSchema.parse(req.body);
    const result = await verifyOtp(dto.identifier, dto.channel, dto.purpose, dto.code, {
      ip: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });

    if (dto.purpose === 'signin') {
      if (!result.userId) {
        // signin requires a known user — defensive guard (B's service should
        // never return userId:null for purpose:'signin' against a live row).
        res.status(404).json({ code: 'OTP_NOT_FOUND', error: 'No user found for this identifier' });
        return;
      }
      const session = await issueSessionForUserId(result.userId, {
        ip: req.ip ?? null,
        deviceLabel: req.get('user-agent') ?? null,
        platform: 'web',
      });
      if (!session) {
        res.status(500).json({ code: 'INTERNAL_ERROR', error: 'Failed to mint session after OTP verify' });
        return;
      }
      res.json({ user: session.user, session, otpId: result.otpId });
      return;
    }

    // registration / mobile_verify / password_reset — return raw OTP envelope.
    // Caller chains to /auth/register or sets a password using otpId as proof.
    res.json({ otpId: result.otpId, userId: result.userId });
  } catch (err) {
    if (err instanceof OtpError) {
      const { status, body } = mapOtpErrorToHttp(err);
      res.status(status).json(body);
      return;
    }
    next(err);
  }
});
