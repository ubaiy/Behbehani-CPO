import { z } from 'zod';
import { ADMIN_ROLES } from './roles.js';
import { KuwaitMobileRegex } from './auth.schemas.js';

/**
 * Admin User-management DTOs shared between API and admin frontend.
 * Plan reference: SRS FR-ADM-002 (RBAC), FR-ADM-021 (audit).
 *
 * passwordHash is NEVER returned to the client — all DTOs omit it.
 * failedLoginCount and lockedUntil ARE included (visible to super_admins).
 */

// ─── Shared primitives ─────────────────────────────────────────────────────

// z.enum requires a mutable non-empty tuple; spread gives us the right shape
// without losing the literal union produced by ADMIN_ROLES.
const AdminRoleSchema = z.enum([...ADMIN_ROLES] as [
  (typeof ADMIN_ROLES)[0],
  ...(typeof ADMIN_ROLES)[number][],
]);

const UserStatusSchema = z.enum(['active', 'locked', 'disabled']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

const LocaleSchema = z.enum(['en', 'ar']);
const UserRoleSchema = z.enum(['customer', 'admin', 'dealer']);

const IsoDateSchema = z.string().datetime();
const UuidSchema = z.string().uuid();

// ─── Filter ────────────────────────────────────────────────────────────────

export const AdminUserFilterSchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(['active', 'locked', 'disabled', 'all']).default('all'),
  adminRoles: z.array(AdminRoleSchema).optional(),
  hasAdminRoleOnly: z.boolean().optional(),
  sort: z
    .enum(['createdAt:desc', 'createdAt:asc', 'lastSignInAt:desc', 'fullName:asc'])
    .default('createdAt:desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type AdminUserFilter = z.infer<typeof AdminUserFilterSchema>;

// ─── Summary DTO (list rows) ────────────────────────────────────────────────

export const AdminUserSummaryDtoSchema = z.object({
  id: UuidSchema,
  fullName: z.string(),
  email: z.string().nullable(),
  mobile: z.string().nullable(),
  role: UserRoleSchema,
  adminRoles: z.array(AdminRoleSchema),
  // Derived: lockedUntil > now → 'locked'; deletedAt set → 'disabled'; else 'active'
  status: UserStatusSchema,
  emailVerifiedAt: IsoDateSchema.nullable(),
  mobileVerifiedAt: IsoDateSchema.nullable(),
  lockedUntil: IsoDateSchema.nullable(),
  failedLoginCount: z.number().int().min(0),
  lastSignInAt: IsoDateSchema.nullable(),
  createdAt: IsoDateSchema,
});
export type AdminUserSummaryDto = z.infer<typeof AdminUserSummaryDtoSchema>;

// ─── Detail DTO (single-user GET) ──────────────────────────────────────────

export const AdminUserDetailDtoSchema = AdminUserSummaryDtoSchema.extend({
  locale: LocaleSchema,
  createdByName: z.string().nullable(),
  createdById: UuidSchema.nullable(),
});
export type AdminUserDetailDto = z.infer<typeof AdminUserDetailDtoSchema>;

// ─── Create request ────────────────────────────────────────────────────────

export const AdminUserCreateSchema = z
  .object({
    fullName: z.string().min(1).max(200),
    email: z.string().email().nullable().default(null),
    mobile: z.string().regex(KuwaitMobileRegex).nullable().default(null),
    accountType: z.enum(['admin', 'customer']),
    adminRoles: z.array(AdminRoleSchema).default([]),
    locale: LocaleSchema.default('en'),
    passwordMode: z.enum(['generate', 'manual']),
    password: z.string().min(8).max(200).optional(),
    requirePasswordChangeOnNextSignIn: z.boolean().default(true),
  })
  .refine((d) => d.email !== null || d.mobile !== null, {
    message: 'Either email or mobile is required',
    path: ['email'],
  })
  .refine((d) => d.passwordMode !== 'manual' || (!!d.password && d.password.length >= 8), {
    message: 'password is required when passwordMode is manual',
    path: ['password'],
  })
  .refine((d) => d.accountType === 'customer' || d.adminRoles.length > 0, {
    message: 'Staff users must have at least one admin role',
    path: ['adminRoles'],
  });
export type AdminUserCreate = z.infer<typeof AdminUserCreateSchema>;

// ─── Create response ───────────────────────────────────────────────────────

export const AdminUserCreateResponseSchema = z.object({
  user: AdminUserDetailDtoSchema,
  // Populated only when passwordMode was 'generate'; null otherwise (one-time display).
  generatedPassword: z.string().nullable(),
});
export type AdminUserCreateResponse = z.infer<typeof AdminUserCreateResponseSchema>;

// ─── Update request (PATCH) ────────────────────────────────────────────────

export const AdminUserUpdateSchema = z
  .object({
    fullName: z.string().min(1).max(200).optional(),
    email: z.string().email().nullable().optional(),
    mobile: z.string().regex(KuwaitMobileRegex).nullable().optional(),
    locale: LocaleSchema.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field must be provided',
  });
export type AdminUserUpdate = z.infer<typeof AdminUserUpdateSchema>;

// ─── Role mutation ─────────────────────────────────────────────────────────

export const AdminUserAssignRolesSchema = z.object({
  adminRoles: z.array(AdminRoleSchema),
});
export type AdminUserAssignRoles = z.infer<typeof AdminUserAssignRolesSchema>;

// ─── Account status mutations ──────────────────────────────────────────────

export const AdminUserLockSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type AdminUserLock = z.infer<typeof AdminUserLockSchema>;

export const AdminUserUnlockSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type AdminUserUnlock = z.infer<typeof AdminUserUnlockSchema>;

export const AdminUserDisableSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type AdminUserDisable = z.infer<typeof AdminUserDisableSchema>;

export const AdminUserEnableSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type AdminUserEnable = z.infer<typeof AdminUserEnableSchema>;

// ─── Password reset ────────────────────────────────────────────────────────

export const AdminUserResetPasswordSchema = z
  .object({
    mode: z.enum(['generate', 'manual']),
    password: z.string().min(8).max(200).optional(),
  })
  .refine((d) => d.mode !== 'manual' || (!!d.password && d.password.length >= 8), {
    message: 'password is required when mode is manual',
    path: ['password'],
  });
export type AdminUserResetPassword = z.infer<typeof AdminUserResetPasswordSchema>;

export const AdminUserResetPasswordResponseSchema = z.object({
  generatedPassword: z.string().nullable(),
  requireChangeOnNextSignIn: z.literal(true),
});
export type AdminUserResetPasswordResponse = z.infer<typeof AdminUserResetPasswordResponseSchema>;

// ─── List response ─────────────────────────────────────────────────────────

export const AdminUserListResponseSchema = z.object({
  items: z.array(AdminUserSummaryDtoSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type AdminUserListResponse = z.infer<typeof AdminUserListResponseSchema>;
