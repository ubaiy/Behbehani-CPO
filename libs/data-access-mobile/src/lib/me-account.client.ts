/**
 * MeAccountApiClient — authenticated profile + address endpoints.
 *
 * Wires to:
 *   GET    /v1/public/me/profile
 *   PATCH  /v1/public/me/profile
 *   GET    /v1/public/me/addresses
 *   POST   /v1/public/me/addresses
 *   PATCH  /v1/public/me/addresses/:id
 *   DELETE /v1/public/me/addresses/:id
 *
 *   POST   /v1/public/me/avatar/upload-url     → { uploadUrl, objectKey }
 *   POST   /v1/public/me/email                 → { otpId, expiresAt }
 *   POST   /v1/public/me/email/verify          → PublicUser
 *   POST   /v1/public/me/mobile                → { otpId, expiresAt }
 *   POST   /v1/public/me/mobile/verify         → PublicUser
 *   POST   /v1/public/me/password              → 204 (void)
 *
 * All responses are Zod-validated at the boundary.
 * Constructor accepts an AxiosInstance so the app-level http.ts singleton
 * (intercepted httpClient — auth + 401-refresh) is injected at boot time.
 *
 * Task v0.18.b / me-account.schemas.ts shapes.
 * Task v0.22.c — avatar upload, email/mobile OTP, password change.
 */

import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import {
  ProfilePatchSchema,
  AddressInputSchema,
  AddressPatchSchema,
  AddressDtoSchema,
  type ProfilePatchDto,
  type AddressInputDto,
  type AddressPatchDto,
  type AddressDto,
} from '@behbehani-cpo/shared-types';
import type { PublicUser } from '@behbehani-cpo/shared-types';

const ME_BASE = '/v1/public/me';
const PROFILE_BASE = `${ME_BASE}/profile`;
const ADDRESSES_BASE = `${ME_BASE}/addresses`;
const AVATAR_UPLOAD_URL = `${ME_BASE}/avatar/upload-url`;
const EMAIL_BASE = `${ME_BASE}/email`;
const EMAIL_VERIFY = `${ME_BASE}/email/verify`;
const MOBILE_BASE = `${ME_BASE}/mobile`;
const MOBILE_VERIFY = `${ME_BASE}/mobile/verify`;
const PASSWORD_BASE = `${ME_BASE}/password`;

// ─── Shared Zod shape for PublicUser ─────────────────────────────────────────

const PublicUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  mobile: z.string().nullable(),
  fullName: z.string(),
  role: z.string(),
  adminRoles: z.array(z.string()),
  locale: z.enum(['en', 'ar']),
  avatarUrl: z.string().nullable(),
  status: z.string(),
  emailVerifiedAt: z.string().nullable(),
  mobileVerifiedAt: z.string().nullable(),
  hasPassword: z.boolean(),
  createdAt: z.string(),
  lastSignInAt: z.string().nullable(),
});

const OtpResponseSchema = z.object({
  otpId: z.string(),
  expiresAt: z.string(),
});

// ─── Address list response schema (inline — not separately exported by shared-types) ───

const AddressListResponseSchema = z.object({
  items: z.array(AddressDtoSchema),
  total: z.number().int().min(0),
});

export type AddressListResponse = z.infer<typeof AddressListResponseSchema>;

// ─── Client ───────────────────────────────────────────────────────────────────

export class MeAccountApiClient {
  /**
   * @param axios Intercepted AxiosInstance (httpClient). Auth header + 401-refresh
   *              are handled transparently by the request/response interceptors.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Fetches the authenticated customer's profile.
   * GET /v1/public/me/profile
   */
  async getProfile(): Promise<PublicUser> {
    const res = await this.axios.get<unknown>(PROFILE_BASE);
    return PublicUserSchema.parse(res.data) as unknown as PublicUser;
  }

  /**
   * Partially updates the authenticated customer's profile.
   * PATCH /v1/public/me/profile
   */
  async updateProfile(input: ProfilePatchDto): Promise<PublicUser> {
    const body = ProfilePatchSchema.parse(input);
    const res = await this.axios.patch<unknown>(PROFILE_BASE, body);
    return PublicUserSchema.parse(res.data) as unknown as PublicUser;
  }

  // ─── Avatar (v0.22.c — 3-step S3 flow matching B v1.5.10) ───────────────────

  /**
   * Step 1: Request a presigned S3 PUT URL.
   * POST /v1/public/me/avatar/upload-url
   */
  async requestAvatarUploadUrl(input: {
    mimeType: string;
    fileSizeBytes: number;
  }): Promise<{ uploadUrl: string; objectKey: string }> {
    const res = await this.axios.post<unknown>(AVATAR_UPLOAD_URL, input);
    return z
      .object({ uploadUrl: z.string(), objectKey: z.string() })
      .parse(res.data);
  }

  /**
   * Step 3: Confirm avatar after raw S3 PUT succeeds.
   * PATCH /v1/public/me/profile with { avatarUrl: objectKey }
   */
  async confirmAvatar(input: { objectKey: string }): Promise<PublicUser> {
    return this.updateProfile({ avatarUrl: input.objectKey });
  }

  /**
   * Remove avatar (set avatarUrl to null).
   * PATCH /v1/public/me/profile with { avatarUrl: null }
   */
  async removeAvatar(): Promise<PublicUser> {
    return this.updateProfile({ avatarUrl: null });
  }

  // ─── Email OTP (v0.22.c) ─────────────────────────────────────────────────────

  /**
   * Send OTP to new email address.
   * POST /v1/public/me/email → { otpId, expiresAt }
   */
  async sendEmailVerificationCode(input: {
    newEmail: string;
  }): Promise<{ otpId: string; expiresAt: string }> {
    const res = await this.axios.post<unknown>(EMAIL_BASE, input);
    return OtpResponseSchema.parse(res.data);
  }

  /**
   * Verify OTP + finalize email change.
   * POST /v1/public/me/email/verify → PublicUser
   */
  async verifyEmailChange(input: {
    newEmail: string;
    code: string;
  }): Promise<PublicUser> {
    const res = await this.axios.post<unknown>(EMAIL_VERIFY, input);
    return PublicUserSchema.parse(res.data) as unknown as PublicUser;
  }

  // ─── Mobile OTP (v0.22.c) ────────────────────────────────────────────────────

  /**
   * Send OTP to new mobile number.
   * POST /v1/public/me/mobile → { otpId, expiresAt }
   */
  async sendMobileVerificationCode(input: {
    newMobile: string;
  }): Promise<{ otpId: string; expiresAt: string }> {
    const res = await this.axios.post<unknown>(MOBILE_BASE, input);
    return OtpResponseSchema.parse(res.data);
  }

  /**
   * Verify OTP + finalize mobile change.
   * POST /v1/public/me/mobile/verify → PublicUser
   */
  async verifyMobileChange(input: {
    newMobile: string;
    code: string;
  }): Promise<PublicUser> {
    const res = await this.axios.post<unknown>(MOBILE_VERIFY, input);
    return PublicUserSchema.parse(res.data) as unknown as PublicUser;
  }

  // ─── Password (v0.22.c) ──────────────────────────────────────────────────────

  /**
   * Set or change password.
   * POST /v1/public/me/password → 204 (void)
   * `currentPassword` required iff user.hasPassword === true.
   */
  async changePassword(input: {
    currentPassword?: string;
    newPassword: string;
  }): Promise<void> {
    await this.axios.post<void>(PASSWORD_BASE, input, { observe: 'response' } as never);
  }

  /**
   * Lists the authenticated customer's saved addresses.
   * GET /v1/public/me/addresses
   */
  async listAddresses(): Promise<AddressListResponse> {
    const res = await this.axios.get<unknown>(ADDRESSES_BASE);
    return AddressListResponseSchema.parse(res.data);
  }

  /**
   * Creates a new address.
   * POST /v1/public/me/addresses
   *
   * Pass an idempotencyKey per attempt to prevent duplicate creation on retry.
   * Sent as the `Idempotency-Key` request header.
   */
  async createAddress(input: AddressInputDto, idempotencyKey?: string): Promise<AddressDto> {
    const body = AddressInputSchema.parse(input);
    const res = await this.axios.post<unknown>(ADDRESSES_BASE, body, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return AddressDtoSchema.parse(res.data);
  }

  /**
   * Partially updates an existing address.
   * PATCH /v1/public/me/addresses/:id
   */
  async updateAddress(id: string, input: AddressPatchDto): Promise<AddressDto> {
    const body = AddressPatchSchema.parse(input);
    const res = await this.axios.patch<unknown>(`${ADDRESSES_BASE}/${id}`, body);
    return AddressDtoSchema.parse(res.data);
  }

  /**
   * Deletes an address.
   * DELETE /v1/public/me/addresses/:id
   *
   * Returns void — 204 No Content carries no parseable body.
   */
  async deleteAddress(id: string): Promise<void> {
    await this.axios.delete<unknown>(`${ADDRESSES_BASE}/${id}`);
  }
}
