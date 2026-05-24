/**
 * Me-account service — all 15 /v1/public/me/* endpoint implementations.
 *
 * Contract: CONCIERGE_INSPECTION_API_CONTRACT.md v1.3.0 §6 + §6.1, v1.3.3 §3 EA-1..EA-4.
 *
 * Error semantics:
 *   Throw MeAccountError with a typed code; controller maps to HTTP via
 *   mapMeAccountErrorToHttp (mirrors mapOtpErrorToHttp pattern).
 */

import type { Address } from '@prisma/client';
import type {
  AddressDto,
  AddressInputDto,
  AddressPatchDto,
  MeAccountErrorCode,
  NotificationPreferencesDto,
  OtpInitiateResponseDto,
} from '@behbehani-cpo/shared-types';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferencesSchema,
} from '@behbehani-cpo/shared-types';
import { randomUUID } from 'node:crypto';
import { prisma } from '../db/prisma';
import { findById, hashPassword, toPublic, verifyPassword } from '../auth/users.repo';
import { issueOtp, verifyOtp } from '../auth/otp.service';
import { presignPutUrl } from '../lib/s3';
import { env } from '../config/env';
import type { PublicUser } from '@behbehani-cpo/shared-types';

// ─── Error class ─────────────────────────────────────────────────────────────

export class MeAccountError extends Error {
  constructor(public readonly code: MeAccountErrorCode, message: string) {
    super(message);
    this.name = 'MeAccountError';
  }
}

export function mapMeAccountErrorToHttp(
  err: MeAccountError,
): { status: number; body: { code: MeAccountErrorCode; error: string } } {
  const statusByCode: Record<MeAccountErrorCode, number> = {
    ME_USER_NOT_FOUND: 404,
    ME_ADDRESS_NOT_FOUND: 404,
    ME_ADDRESS_NOT_OWNED: 403,
    ME_EMAIL_TAKEN: 409,
    ME_MOBILE_TAKEN: 409,
    ME_CURRENT_PASSWORD_REQUIRED: 422,
    ME_CURRENT_PASSWORD_INCORRECT: 401,
    ME_OTP_INVALID: 400,
    // v1.5.10 — avatar upload presign
    AVATAR_TOO_LARGE: 422,
    AVATAR_MIME_NOT_ALLOWED: 422,
  };
  return { status: statusByCode[err.code], body: { code: err.code, error: err.message } };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapAddressToDto(a: Address): AddressDto {
  return {
    id: a.id,
    label: a.label,
    governorate: a.governorate as AddressDto['governorate'],
    area: a.area,
    block: a.block,
    street: a.street,
    building: a.building,
    unit: a.unit ?? null,
    lat: a.lat ?? null,
    lng: a.lng ?? null,
    isDefault: a.isDefault,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

async function fetchAddresses(userId: string): Promise<AddressDto[]> {
  const rows = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  return rows.map(mapAddressToDto);
}

async function requireUser(userId: string) {
  const user = await findById(userId);
  if (!user) throw new MeAccountError('ME_USER_NOT_FOUND', 'User not found');
  return user;
}

// ─── 1. GET /v1/public/me ─────────────────────────────────────────────────────

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await requireUser(userId);
  return toPublic(user);
}

// ─── 2. PATCH /v1/public/me/profile ──────────────────────────────────────────

export async function patchProfile(
  userId: string,
  dto: { fullName?: string; locale?: 'en' | 'ar'; avatarUrl?: string | null },
): Promise<PublicUser> {
  // Build only the fields that were provided.
  const data: Record<string, unknown> = {};
  if (dto.fullName !== undefined) data['fullName'] = dto.fullName;
  if (dto.locale !== undefined) data['locale'] = dto.locale;
  if (dto.avatarUrl !== undefined) data['avatarUrl'] = dto.avatarUrl; // null clears it

  const updated = await prisma.user.update({ where: { id: userId }, data });
  return toPublic(updated);
}

// ─── 2b. POST /v1/public/me/avatar/upload-url ────────────────────────────────
// v1.5.10 — closes A v1.5-D7 TODO ("avatar upload endpoint not yet on B side").
// 3-step pre-signed S3 PUT flow mirroring admin Documents v1.4.4:
//   (1) client POSTs this endpoint with mimeType + fileSizeBytes
//   (2) client PUTs raw bytes to the returned `url`
//   (3) client calls PATCH /me/profile with `avatarUrl: returned.key`
//
// The server-set key is `avatars/<userId>/<uuid>.<ext>` — collision-free per
// user, stable across re-uploads (old key becomes orphaned on PATCH; cleanup
// is deferred to a v1.6+ janitor cron). Returned key has NO CDN prefix —
// `toPublic()` in users.repo.ts:108 prepends env.CDN_BASE_URL on every
// subsequent GET /me.

const AVATAR_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
};

export async function presignAvatarUploadUrl(
  userId: string,
  input: { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; fileSizeBytes: number },
): Promise<{ url: string; key: string; expiresAt: string }> {
  // Enforce env-driven byte cap. Zod also caps at 50 MB as a hard upper bound
  // (defense in depth) — this is the soft policy cap that scales with config.
  if (input.fileSizeBytes > env.MAX_AVATAR_BYTES) {
    throw new MeAccountError(
      'AVATAR_TOO_LARGE',
      `Avatar exceeds max size (${env.MAX_AVATAR_BYTES} bytes)`,
    );
  }

  const ext = AVATAR_MIME_TO_EXT[input.mimeType];
  if (!ext) {
    // Zod should have caught this — defensive only.
    throw new MeAccountError('AVATAR_MIME_NOT_ALLOWED', 'Unsupported avatar MIME type');
  }

  // Stable key per upload. Re-uploads land at a new key (different uuid) so
  // CDN-cached old avatars don't have to be invalidated.
  const key = `avatars/${userId}/${randomUUID()}.${ext}`;

  const presign = await presignPutUrl(key, input.mimeType, input.fileSizeBytes);
  return {
    url:       presign.url,
    key:       presign.key,
    expiresAt: presign.expiresAt.toISOString(),
  };
}

// ─── 3. POST /v1/public/me/email — initiate (EA-1) ───────────────────────────

export async function initiateEmailChange(
  userId: string,
  newEmail: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<OtpInitiateResponseDto> {
  // Guard: email already taken by another user.
  const existing = await prisma.user.findFirst({
    where: { email: { equals: newEmail, mode: 'insensitive' }, id: { not: userId }, deletedAt: null },
    select: { id: true },
  });
  if (existing) throw new MeAccountError('ME_EMAIL_TAKEN', 'Email address is already in use');

  return issueOtp(newEmail, 'email', 'email_change', { userId, ...ctx });
}

// ─── 4. POST /v1/public/me/email/verify ──────────────────────────────────────

export async function verifyEmailChange(
  userId: string,
  newEmail: string,
  code: string,
): Promise<PublicUser> {
  try {
    await verifyOtp(newEmail, 'email', 'email_change', code);
  } catch (err) {
    // Re-wrap OtpError so the controller's single catch block handles it.
    throw err;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { email: newEmail, emailVerifiedAt: new Date() },
  });
  return toPublic(updated);
}

// ─── 5. POST /v1/public/me/mobile — initiate (EA-1) ──────────────────────────

export async function initiateMobileChange(
  userId: string,
  newMobile: string,
  ctx: { ip?: string | null; userAgent?: string | null },
): Promise<OtpInitiateResponseDto> {
  // Guard: mobile already taken by another user.
  const existing = await prisma.user.findFirst({
    where: { mobile: newMobile, id: { not: userId }, deletedAt: null },
    select: { id: true },
  });
  if (existing) throw new MeAccountError('ME_MOBILE_TAKEN', 'Mobile number is already in use');

  return issueOtp(newMobile, 'sms', 'mobile_change', { userId, ...ctx });
}

// ─── 6. POST /v1/public/me/mobile/verify ─────────────────────────────────────

export async function verifyMobileChange(
  userId: string,
  newMobile: string,
  code: string,
): Promise<PublicUser> {
  try {
    await verifyOtp(newMobile, 'sms', 'mobile_change', code);
  } catch (err) {
    throw err;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { mobile: newMobile, mobileVerifiedAt: new Date() },
  });
  return toPublic(updated);
}

// ─── 7. POST /v1/public/me/password (EA-4) ───────────────────────────────────

/**
 * EA-4 guarantee: Postgres write commits before response; toPublic.hasPassword
 * derives from passwordHash !== null on every read. A future cache layer MUST
 * NOT cache the PublicUser shape across this endpoint — hasPassword will flip
 * from false→true on first-time set and any cached value would be stale.
 *
 * currentPassword is optional when hasPassword=false (first-time set). If
 * hasPassword=true and currentPassword is absent, throws
 * ME_CURRENT_PASSWORD_REQUIRED. If present but wrong, throws
 * ME_CURRENT_PASSWORD_INCORRECT.
 */
export async function changePassword(
  userId: string,
  dto: { currentPassword?: string; newPassword: string },
): Promise<void> {
  const user = await requireUser(userId);
  const hasPassword = user.passwordHash !== null;

  if (hasPassword) {
    if (!dto.currentPassword) {
      throw new MeAccountError('ME_CURRENT_PASSWORD_REQUIRED', 'Current password is required');
    }
    const ok = await verifyPassword(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new MeAccountError('ME_CURRENT_PASSWORD_INCORRECT', 'Current password is incorrect');
    }
  }

  const newHash = await hashPassword(dto.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
  // 204 No Content — caller returns res.sendStatus(204).
}

// ─── 8. POST /v1/public/me/sign-out-all (EA-3) ───────────────────────────────

/**
 * EA-3: Revokes all OTHER active sessions for the user, preserving the caller's
 * current session so they remain signed in. The caller can sign out manually
 * (or via session expiry) for a full reset.
 *
 * `callerSessionJti` is the refreshTokenJti embedded in the caller's access
 * token (the `sessionJti` claim), used to identify and exclude their row.
 *
 * The `revoked` count excludes already-revoked rows and the caller's own row.
 */
export async function signOutAll(userId: string, callerSessionJti: string): Promise<{ revoked: number }> {
  const result = await prisma.userDeviceSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      NOT: { refreshTokenJti: callerSessionJti },
    },
    data: { revokedAt: new Date(), refreshTokenJti: null },
  });
  return { revoked: result.count };
}

// ─── 9. GET /v1/public/me/addresses ──────────────────────────────────────────

export async function getAddresses(userId: string): Promise<AddressDto[]> {
  return fetchAddresses(userId);
}

// ─── 10. POST /v1/public/me/addresses (EA-2) ─────────────────────────────────

export async function createAddress(
  userId: string,
  dto: AddressInputDto,
): Promise<AddressDto[]> {
  const rows = await prisma.$transaction(async (tx) => {
    // If this is the first address, make it default automatically.
    const existing = await tx.address.count({ where: { userId } });
    await tx.address.create({
      data: {
        userId,
        label: dto.label,
        governorate: dto.governorate,
        area: dto.area,
        block: dto.block,
        street: dto.street,
        building: dto.building,
        unit: dto.unit ?? null,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        isDefault: existing === 0,
      },
    });
    return tx.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  });
  return rows.map(mapAddressToDto);
}

// ─── 11. PATCH /v1/public/me/addresses/:id (EA-2) ────────────────────────────

export async function updateAddress(
  userId: string,
  addressId: string,
  dto: AddressPatchDto,
): Promise<AddressDto[]> {
  await requireOwnedAddress(userId, addressId);

  const data: Record<string, unknown> = {};
  if (dto.label !== undefined) data['label'] = dto.label;
  if (dto.governorate !== undefined) data['governorate'] = dto.governorate;
  if (dto.area !== undefined) data['area'] = dto.area;
  if (dto.block !== undefined) data['block'] = dto.block;
  if (dto.street !== undefined) data['street'] = dto.street;
  if (dto.building !== undefined) data['building'] = dto.building;
  if (dto.unit !== undefined) data['unit'] = dto.unit ?? null;
  if (dto.lat !== undefined) data['lat'] = dto.lat ?? null;
  if (dto.lng !== undefined) data['lng'] = dto.lng ?? null;

  const rows = await prisma.$transaction(async (tx) => {
    await tx.address.update({ where: { id: addressId }, data });
    return tx.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  });
  return rows.map(mapAddressToDto);
}

// ─── 12. DELETE /v1/public/me/addresses/:id (EA-2) ───────────────────────────

export async function deleteAddress(
  userId: string,
  addressId: string,
): Promise<AddressDto[]> {
  const addr = await requireOwnedAddress(userId, addressId);

  const rows = await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id: addressId } });
    // If the deleted address was the default, promote the earliest remaining.
    if (addr.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (next) {
        await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
    return tx.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  });
  return rows.map(mapAddressToDto);
}

// ─── 13. POST /v1/public/me/addresses/:id/default (EA-2) ─────────────────────

/**
 * Sets the given address as default for the user, atomically clearing all
 * other isDefault=true rows. Uses a transaction to satisfy the partial unique
 * index semantics from §4 of the contract.
 */
export async function setDefaultAddress(
  userId: string,
  addressId: string,
): Promise<AddressDto[]> {
  await requireOwnedAddress(userId, addressId);

  const rows = await prisma.$transaction(async (tx) => {
    // Clear all existing defaults for this user.
    await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    // Set the new default.
    await tx.address.update({ where: { id: addressId }, data: { isDefault: true } });
    return tx.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  });
  return rows.map(mapAddressToDto);
}

// ─── 14. GET /v1/public/me/notification-preferences ──────────────────────────

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferencesDto> {
  const user = await requireUser(userId);
  if (!user.notificationPreferences) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
  // Parse stored JSON through schema to ensure shape consistency.
  const parsed = NotificationPreferencesSchema.safeParse(user.notificationPreferences);
  if (!parsed.success) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
  return parsed.data;
}

// ─── 15. PUT /v1/public/me/notification-preferences ──────────────────────────

export async function setNotificationPreferences(
  userId: string,
  dto: NotificationPreferencesDto,
): Promise<NotificationPreferencesDto> {
  await prisma.user.update({
    where: { id: userId },
    data: { notificationPreferences: dto as object },
  });
  return dto;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function requireOwnedAddress(userId: string, addressId: string): Promise<Address> {
  const addr = await prisma.address.findUnique({ where: { id: addressId } });
  if (!addr) throw new MeAccountError('ME_ADDRESS_NOT_FOUND', 'Address not found');
  if (addr.userId !== userId) throw new MeAccountError('ME_ADDRESS_NOT_OWNED', 'Address belongs to another user');
  return addr;
}
