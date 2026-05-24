import { z } from 'zod';

/**
 * Me-account endpoint DTOs — public Zod schemas.
 *
 * Contract: CONCIERGE_INSPECTION_API_CONTRACT.md v1.3.0 §6, §6.1, v1.3.3 §3.
 * All 15 endpoints under /v1/public/me/* use these shapes.
 */

// ─── Kuwait mobile regex (re-exported from auth.schemas for use here) ────────

export const KuwaitMobileRegexMe = /^(?:\+?965)?[569]\d{7}$/;

// ─── Profile ─────────────────────────────────────────────────────────────────

/** PATCH /v1/public/me/profile */
export const ProfilePatchSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  locale: z.enum(['en', 'ar']).optional(),
  /** Relative S3 key (no CDN prefix) or null to clear avatar. */
  avatarUrl: z.string().max(500).nullable().optional(),
});
export type ProfilePatchDto = z.infer<typeof ProfilePatchSchema>;

// ─── Avatar upload (v1.5.10 — closes A v1.5-D7 TODO) ─────────────────────────

/** Allowed avatar MIME types. Server rejects everything else with code
 *  `AVATAR_MIME_NOT_ALLOWED` (422). Kept narrow on purpose — animated GIFs
 *  + HEIC/HEIF + raw camera formats are explicitly excluded so the CDN
 *  doesn't have to deal with format conversion or huge file sizes. */
export const AvatarMimeTypeSchema = z.enum([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
export type AvatarMimeType = z.infer<typeof AvatarMimeTypeSchema>;

/** POST /v1/public/me/avatar/upload-url — client requests a presigned PUT URL.
 *
 *  Flow (3-step, mirrors admin Documents v1.4.4 pattern):
 *    1. Client POSTs this endpoint with mimeType + fileSizeBytes
 *    2. Client PUTs the image bytes directly to the returned `url`
 *    3. Client calls existing PATCH /v1/public/me/profile with the returned
 *       `key` as `avatarUrl` (server then prefixes CDN_BASE_URL in toPublic)
 *
 *  Validation:
 *   - mimeType ∈ { image/jpeg, image/png, image/webp } (Zod refine)
 *   - fileSizeBytes ≤ env.MAX_AVATAR_BYTES (default 5 MB; service enforces)
 *   - fileSizeBytes ≥ 1024 (1 KB minimum — catches empty/bogus uploads)
 */
export const AvatarUploadUrlInputSchema = z.object({
  mimeType: AvatarMimeTypeSchema,
  fileSizeBytes: z.number().int().min(1024).max(50_000_000),  // hard upper bound; service enforces env.MAX_AVATAR_BYTES
});
export type AvatarUploadUrlInputDto = z.infer<typeof AvatarUploadUrlInputSchema>;

/** Response shape for POST /v1/public/me/avatar/upload-url. */
export const AvatarUploadUrlResponseSchema = z.object({
  /** Pre-signed S3 PUT URL — client uploads bytes via plain HTTP PUT. */
  url: z.string().url(),
  /** Relative S3 key (e.g. "avatars/<userId>/<uuid>.jpg") — client passes this
   *  back to PATCH /me/profile as `avatarUrl`. */
  key: z.string(),
  /** ISO-8601 timestamp after which the presigned URL is no longer valid.
   *  Currently env.S3_PRESIGN_TTL_SEC (default 900s = 15 min). */
  expiresAt: z.string().datetime(),
});
export type AvatarUploadUrlResponseDto = z.infer<typeof AvatarUploadUrlResponseSchema>;

// ─── Email change ─────────────────────────────────────────────────────────────

/** POST /v1/public/me/email — initiates OTP flow. EA-1: returns 202 {otpId, expiresAt}. */
export const EmailChangeRequestSchema = z.object({
  newEmail: z.string().email().max(254),
});
export type EmailChangeRequestDto = z.infer<typeof EmailChangeRequestSchema>;

/** POST /v1/public/me/email/verify */
export const EmailChangeVerifySchema = z.object({
  newEmail: z.string().email().max(254),
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
});
export type EmailChangeVerifyDto = z.infer<typeof EmailChangeVerifySchema>;

// ─── Mobile change ────────────────────────────────────────────────────────────

/** POST /v1/public/me/mobile — initiates OTP flow. EA-1: returns 202 {otpId, expiresAt}. */
export const MobileChangeRequestSchema = z.object({
  newMobile: z.string().regex(KuwaitMobileRegexMe, 'Must be a valid Kuwait mobile number'),
});
export type MobileChangeRequestDto = z.infer<typeof MobileChangeRequestSchema>;

/** POST /v1/public/me/mobile/verify */
export const MobileChangeVerifySchema = z.object({
  newMobile: z.string().regex(KuwaitMobileRegexMe, 'Must be a valid Kuwait mobile number'),
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
});
export type MobileChangeVerifyDto = z.infer<typeof MobileChangeVerifySchema>;

// ─── Password change ──────────────────────────────────────────────────────────

/**
 * POST /v1/public/me/password
 *
 * `currentPassword` is optional at the schema level. The service throws
 * ME_ACCOUNT_CURRENT_PASSWORD_REQUIRED when hasPassword=true and
 * currentPassword is missing or incorrect.
 */
export const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'must contain uppercase')
    .regex(/[a-z]/, 'must contain lowercase')
    .regex(/\d/, 'must contain digit')
    .regex(/[^A-Za-z0-9]/, 'must contain symbol'),
});
export type PasswordChangeDto = z.infer<typeof PasswordChangeSchema>;

// ─── OTP initiate response (EA-1) ────────────────────────────────────────────

export const OtpInitiateResponseSchema = z.object({
  otpId: z.string().uuid(),
  expiresAt: z.string().datetime(),
});
export type OtpInitiateResponseDto = z.infer<typeof OtpInitiateResponseSchema>;

// ─── Sign-out-all response (EA-3) ────────────────────────────────────────────

export const SignOutAllResponseSchema = z.object({
  revoked: z.number().int().nonnegative(),
});
export type SignOutAllResponseDto = z.infer<typeof SignOutAllResponseSchema>;

// ─── Address ──────────────────────────────────────────────────────────────────

export const KuwaitGovernorateSchema = z.enum([
  'capital',
  'hawalli',
  'ahmadi',
  'jahra',
  'farwaniya',
  'mubarak_al_kabeer',
]);

/** Shared write shape for POST and PATCH /v1/public/me/addresses[/:id]. */
export const AddressInputSchema = z.object({
  label: z.string().min(1).max(80),
  governorate: KuwaitGovernorateSchema,
  area: z.string().min(1).max(120),
  block: z.string().min(1).max(40),
  street: z.string().min(1).max(120),
  building: z.string().min(1).max(120),
  unit: z.string().max(40).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
});
export type AddressInputDto = z.infer<typeof AddressInputSchema>;

/** Partial variant for PATCH /v1/public/me/addresses/:id. */
export const AddressPatchSchema = AddressInputSchema.partial();
export type AddressPatchDto = z.infer<typeof AddressPatchSchema>;

/** Output shape returned by GET/POST/PATCH/DELETE/default address endpoints (EA-2). */
export const AddressDtoSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  governorate: KuwaitGovernorateSchema,
  area: z.string(),
  block: z.string(),
  street: z.string(),
  building: z.string(),
  unit: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  isDefault: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AddressDto = z.infer<typeof AddressDtoSchema>;

// ─── Notification preferences (v1.3.0 §6.1) ─────────────────────────────────

/**
 * accountSecurity is always true — cannot be disabled.
 * The Zod literal enforces this so a client sending false gets a validation error.
 */
export const NotificationPreferencesSchema = z.object({
  channels: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
  }),
  categories: z.object({
    bookingUpdates: z.boolean(),
    listingAlerts: z.boolean(),
    marketing: z.boolean(),
    accountSecurity: z.literal(true),
  }),
});
export type NotificationPreferencesDto = z.infer<typeof NotificationPreferencesSchema>;

/** Default preferences returned when the column is NULL (no preferences saved yet). */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesDto = {
  channels: { email: true, sms: true, push: true },
  categories: {
    bookingUpdates: true,
    listingAlerts: true,
    marketing: false,
    accountSecurity: true,
  },
};

// ─── Error codes ─────────────────────────────────────────────────────────────

export const ME_ACCOUNT_ERROR_CODES = [
  'ME_USER_NOT_FOUND',
  'ME_ADDRESS_NOT_FOUND',
  'ME_ADDRESS_NOT_OWNED',
  'ME_EMAIL_TAKEN',
  'ME_MOBILE_TAKEN',
  'ME_CURRENT_PASSWORD_REQUIRED',
  'ME_CURRENT_PASSWORD_INCORRECT',
  'ME_OTP_INVALID',
  // v1.5.10 — avatar upload presigned-URL endpoint
  'AVATAR_TOO_LARGE',
  'AVATAR_MIME_NOT_ALLOWED',
] as const;
export type MeAccountErrorCode = (typeof ME_ACCOUNT_ERROR_CODES)[number];
