/**
 * Me-account controller — all 15 /v1/public/me/* endpoints.
 *
 * Contract: CONCIERGE_INSPECTION_API_CONTRACT.md v1.3.0 §6, v1.3.3 §3 EA-1..EA-4.
 *
 * EA-1: POST /me/email and POST /me/mobile initiate respond 202 {otpId, expiresAt}.
 * EA-2: PATCH/DELETE/default addresses return full Address[] (re-SELECT in tx).
 * EA-3: sign-out-all revokes all OTHER sessions; caller's current session stays alive.
 * EA-4: POST /me/password → 204; next GET /me reflects hasPassword:true guaranteed
 *       because toPublic derives hasPassword from passwordHash !== null on each read.
 *       IMPORTANT: any future cache layer MUST NOT cache PublicUser across this
 *       endpoint — the hasPassword flag changes from false→true on first-time set.
 *
 * All routes require a valid customer session via requireCustomerSession.
 * OtpError from email/mobile verify endpoints is allowed to propagate to
 * the error middleware (mapOtpErrorToHttp is called inline for clarity).
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireCustomerSession } from '../auth/require-customer-session';
import { OtpError, mapOtpErrorToHttp } from '../auth/otp.service';
import {
  AddressInputSchema,
  AddressPatchSchema,
  AvatarUploadUrlInputSchema,
  EmailChangeRequestSchema,
  EmailChangeVerifySchema,
  MobileChangeRequestSchema,
  MobileChangeVerifySchema,
  NotificationPreferencesSchema,
  PasswordChangeSchema,
  ProfilePatchSchema,
} from '@behbehani-cpo/shared-types';
import {
  MeAccountError,
  changePassword,
  createAddress,
  deleteAddress,
  getAddresses,
  getMe,
  getNotificationPreferences,
  initiateEmailChange,
  initiateMobileChange,
  mapMeAccountErrorToHttp,
  patchProfile,
  presignAvatarUploadUrl,
  setDefaultAddress,
  setNotificationPreferences,
  signOutAll,
  updateAddress,
  verifyEmailChange,
  verifyMobileChange,
} from './me-account.service';

export const meAccountRouter = Router();

// Apply customer-session auth to all routes on this router.
meAccountRouter.use(requireCustomerSession);

// Rate limiters — read-heavy routes get more headroom.
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const mutateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const sensitiveActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// ─── Helper ────────────────────────────────────────────────────────────────────

function handleError(err: unknown, res: import('express').Response, next: import('express').NextFunction): void {
  if (err instanceof MeAccountError) {
    const { status, body } = mapMeAccountErrorToHttp(err);
    res.status(status).json(body);
    return;
  }
  if (err instanceof OtpError) {
    const { status, body } = mapOtpErrorToHttp(err);
    res.status(status).json(body);
    return;
  }
  if (err instanceof z.ZodError) {
    res.status(422).json({ code: 'VALIDATION_ERROR', error: 'Validation failed', details: err.errors });
    return;
  }
  next(err);
}

// ─── 1. GET /v1/public/me ──────────────────────────────────────────────────────

meAccountRouter.get('/me', readLimiter, async (req, res, next) => {
  try {
    const user = await getMe(req.customer!.id);
    res.json(user);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ─── 2. PATCH /v1/public/me/profile ───────────────────────────────────────────

// ─── 2b. POST /v1/public/me/avatar/upload-url ─────────────────────────────────
// v1.5.10 — closes A v1.5-D7 TODO. Client requests presigned PUT URL; client
// PUTs raw bytes; client then PATCHes /me/profile with the returned key as
// `avatarUrl`. 3-step flow mirrors admin Documents v1.4.4 pattern.
// Rate limited as sensitive (5/min) — defends against avatar-spam exhaustion.

meAccountRouter.post('/me/avatar/upload-url', sensitiveActionLimiter, async (req, res, next) => {
  try {
    const dto = AvatarUploadUrlInputSchema.parse(req.body);
    const result = await presignAvatarUploadUrl(req.customer!.id, dto);
    res.json(result);
  } catch (err) {
    handleError(err, res, next);
  }
});

meAccountRouter.patch('/me/profile', mutateLimiter, async (req, res, next) => {
  try {
    const dto = ProfilePatchSchema.parse(req.body);
    const user = await patchProfile(req.customer!.id, dto);
    res.json(user);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ─── 3. POST /v1/public/me/email — initiate (EA-1, 202) ───────────────────────

meAccountRouter.post('/me/email', sensitiveActionLimiter, async (req, res, next) => {
  try {
    const { newEmail } = EmailChangeRequestSchema.parse(req.body);
    const result = await initiateEmailChange(req.customer!.id, newEmail, {
      ip: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
    // EA-1: 202 with body — NOT empty.
    res.status(202).json(result);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ─── 4. POST /v1/public/me/email/verify ───────────────────────────────────────

meAccountRouter.post('/me/email/verify', sensitiveActionLimiter, async (req, res, next) => {
  try {
    const { newEmail, code } = EmailChangeVerifySchema.parse(req.body);
    const user = await verifyEmailChange(req.customer!.id, newEmail, code);
    res.json(user);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ─── 5. POST /v1/public/me/mobile — initiate (EA-1, 202) ──────────────────────

meAccountRouter.post('/me/mobile', sensitiveActionLimiter, async (req, res, next) => {
  try {
    const { newMobile } = MobileChangeRequestSchema.parse(req.body);
    const result = await initiateMobileChange(req.customer!.id, newMobile, {
      ip: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
    // EA-1: 202 with body — NOT empty.
    res.status(202).json(result);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ─── 6. POST /v1/public/me/mobile/verify ──────────────────────────────────────

meAccountRouter.post('/me/mobile/verify', sensitiveActionLimiter, async (req, res, next) => {
  try {
    const { newMobile, code } = MobileChangeVerifySchema.parse(req.body);
    const user = await verifyMobileChange(req.customer!.id, newMobile, code);
    res.json(user);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ─── 7. POST /v1/public/me/password (EA-4) ────────────────────────────────────

meAccountRouter.post('/me/password', sensitiveActionLimiter, async (req, res, next) => {
  try {
    const dto = PasswordChangeSchema.parse(req.body);
    await changePassword(req.customer!.id, dto);
    // EA-4: 204 No Content guaranteed. See service comment for cache-layer warning.
    res.sendStatus(204);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ─── 8. POST /v1/public/me/sign-out-all (EA-3) ────────────────────────────────

meAccountRouter.post('/me/sign-out-all', mutateLimiter, async (req, res, next) => {
  try {
    const result = await signOutAll(req.customer!.id, req.customer!.sessionJti);
    res.json(result);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ─── 9. GET /v1/public/me/addresses ───────────────────────────────────────────

meAccountRouter.get('/me/addresses', readLimiter, async (req, res, next) => {
  try {
    const addresses = await getAddresses(req.customer!.id);
    res.json(addresses);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ─── 10. POST /v1/public/me/addresses (EA-2) ──────────────────────────────────

meAccountRouter.post('/me/addresses', mutateLimiter, async (req, res, next) => {
  try {
    const dto = AddressInputSchema.parse(req.body);
    const addresses = await createAddress(req.customer!.id, dto);
    res.json(addresses);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ─── 11. PATCH /v1/public/me/addresses/:id (EA-2) ─────────────────────────────

meAccountRouter.patch('/me/addresses/:id', mutateLimiter, async (req, res, next) => {
  try {
    const dto = AddressPatchSchema.parse(req.body);
    const addresses = await updateAddress(req.customer!.id, req.params.id, dto);
    res.json(addresses);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ─── 12. DELETE /v1/public/me/addresses/:id (EA-2) ────────────────────────────

meAccountRouter.delete('/me/addresses/:id', mutateLimiter, async (req, res, next) => {
  try {
    const addresses = await deleteAddress(req.customer!.id, req.params.id);
    res.json(addresses);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ─── 13. POST /v1/public/me/addresses/:id/default (EA-2) ──────────────────────

meAccountRouter.post('/me/addresses/:id/default', mutateLimiter, async (req, res, next) => {
  try {
    const addresses = await setDefaultAddress(req.customer!.id, req.params.id);
    res.json(addresses);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ─── 14. GET /v1/public/me/notification-preferences ───────────────────────────

meAccountRouter.get('/me/notification-preferences', readLimiter, async (req, res, next) => {
  try {
    const prefs = await getNotificationPreferences(req.customer!.id);
    res.json(prefs);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ─── 15. PUT /v1/public/me/notification-preferences ───────────────────────────

meAccountRouter.put('/me/notification-preferences', mutateLimiter, async (req, res, next) => {
  try {
    const dto = NotificationPreferencesSchema.parse(req.body);
    const prefs = await setNotificationPreferences(req.customer!.id, dto);
    res.json(prefs);
  } catch (err) {
    handleError(err, res, next);
  }
});
