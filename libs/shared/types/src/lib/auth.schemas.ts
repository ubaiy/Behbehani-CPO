import { z } from 'zod';
import type { AdminRole, UserRole } from './roles';

/**
 * Auth DTOs shared between API and frontends.
 * Plan reference: SRS FR-AUTH-001..012.
 */

export const KuwaitMobileRegex = /^(?:\+?965)?[569]\d{7}$/;

export const SignInWithEmailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type SignInWithEmailDto = z.infer<typeof SignInWithEmailSchema>;

export const SignInWithMobileSchema = z.object({
  mobile: z.string().regex(KuwaitMobileRegex),
  password: z.string().min(8),
});
export type SignInWithMobileDto = z.infer<typeof SignInWithMobileSchema>;

// Legacy RequestOtpSchema / VerifyOtpSchema removed in CONTRACT v1.2.4 §3.
// v1.2 OTP DTOs live inline in apps/api/src/auth/auth-public.controller.ts
// with the {identifier, channel, purpose} shape locked in v1.2.0 §1 Q5.

export const RegisterWithEmailSchema = z.object({
  // Mobile is the primary identifier in the KW market; email is optional and
  // can be added during ghost-upgrade or via account-settings later.
  // CONTRACT v1.2.4 §2 — was required pre-v1.2.4.
  email: z.string().email().optional(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'must contain uppercase')
    .regex(/[a-z]/, 'must contain lowercase')
    .regex(/\d/, 'must contain digit')
    .regex(/[^A-Za-z0-9]/, 'must contain symbol'),
  fullName: z.string().min(2).max(120),
  mobile: z.string().regex(KuwaitMobileRegex).optional(),
}).refine((d) => Boolean(d.email || d.mobile), {
  message: 'At least one of email or mobile is required',
  path: ['mobile'],
});
export type RegisterWithEmailDto = z.infer<typeof RegisterWithEmailSchema>;

export const RefreshSchema = z.object({
  refreshToken: z.string().min(20),
});
export type RefreshDto = z.infer<typeof RefreshSchema>;

/** @deprecated Use UserRole from '@behbehani-cpo/shared-types' instead. */
export type AuthRole = UserRole;

/** v1.3.0 §5 — customer account lifecycle status. Distinct from admin-side UserStatus. */
export type CustomerStatus = 'active' | 'suspended' | 'pending_verification';

export interface PublicUser {
  id: string;
  email: string | null;
  mobile: string | null;
  fullName: string;
  role: UserRole;
  adminRoles: AdminRole[];
  locale: 'en' | 'ar';
  /** CDN-prefixed URL, or null when no avatar uploaded. v1.3.0 §5. */
  avatarUrl: string | null;
  /** Account lifecycle status. v1.3.0 §5. */
  status: CustomerStatus;
  /** ISO-8601 timestamp when email was verified; null if not yet verified. */
  emailVerifiedAt: string | null;
  /** ISO-8601 timestamp when mobile was verified; null if not yet verified. */
  mobileVerifiedAt: string | null;
  /** True when the account has a bcrypt password hash (not a ghost/OAuth-only account). */
  hasPassword: boolean;
  /** ISO-8601 account creation timestamp. */
  createdAt: string;
  /** ISO-8601 of last successful sign-in; null if never signed in. */
  lastSignInAt: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string; // ISO-8601
  user: PublicUser;
}
