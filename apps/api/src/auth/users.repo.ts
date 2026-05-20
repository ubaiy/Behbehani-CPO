import bcrypt from 'bcrypt';
import type { Prisma, User } from '@prisma/client';
import type { AdminRole, CustomerStatus, PublicUser, UserRole } from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';
import { env } from '../config/env';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_LOGINS = 5; // FR-AUTH-005
const LOCKOUT_MINUTES = 10;

export type UserRecord = User;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Bcrypt-verify a password. Ghost rows (passwordHash IS NULL) cannot be
 * signed into via password — caller must short-circuit before reaching here.
 * v1.2 (CONTRACT §1 Q2).
 */
export async function verifyPassword(password: string, passwordHash: string | null): Promise<boolean> {
  if (!passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
}

/**
 * True if the user row has no usable credentials yet — created via
 * `createGhostCustomer` during a Concierge booking. Such rows are eligible
 * for in-place upgrade by `registerCustomer` (CONTRACT v1.2.0 §1 Q2).
 */
export function isGhostUser(user: UserRecord): boolean {
  return user.passwordHash === null;
}

export async function createUser(input: {
  email?: string | null;
  mobile?: string | null;
  password: string;
  fullName: string;
  role?: UserRole;
  adminRoles?: AdminRole[];
}): Promise<UserRecord> {
  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      email: input.email ?? null,
      mobile: input.mobile ?? null,
      passwordHash,
      fullName: input.fullName,
      role: input.role ?? 'customer',
      adminRoles: (input.adminRoles ?? []) as Prisma.UserCreateInput['adminRoles'],
    },
  });
}

/**
 * In-place upgrade of a ghost row to a fully-credentialled customer account.
 * Used by `registerCustomer` (CONTRACT v1.2.0 §1 Q2 + v1.2.1 §4.4).
 *
 * Returns the upgraded row. Caller is responsible for emitting the
 * `user.ghost_upgraded` audit entry.
 */
export async function upgradeGhostUser(
  userId: string,
  input: {
    password: string;
    fullName?: string;
    /** When true, set `mobileVerifiedAt = now()` — register flow is OTP-gated. */
    markMobileVerified?: boolean;
  },
): Promise<UserRecord> {
  const passwordHash = await hashPassword(input.password);
  return prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      ...(input.fullName ? { fullName: input.fullName } : {}),
      ...(input.markMobileVerified ? { mobileVerifiedAt: new Date() } : {}),
    },
  });
}

export async function findById(id: string): Promise<UserRecord | null> {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

export async function findByEmail(email: string): Promise<UserRecord | null> {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
  });
}

export async function findByMobile(mobile: string): Promise<UserRecord | null> {
  return prisma.user.findFirst({ where: { mobile, deletedAt: null } });
}

export function toPublic(u: UserRecord): PublicUser {
  return {
    id: u.id,
    email: u.email,
    mobile: u.mobile,
    fullName: u.fullName,
    role: u.role as UserRole,
    adminRoles: (u.adminRoles ?? []) as AdminRole[],
    locale: u.locale as 'en' | 'ar',
    // v1.3.0 §5 extended fields
    avatarUrl: u.avatarUrl ? `${env.CDN_BASE_URL}${u.avatarUrl}` : null,
    status: u.status as CustomerStatus,
    emailVerifiedAt: u.emailVerifiedAt?.toISOString() ?? null,
    mobileVerifiedAt: u.mobileVerifiedAt?.toISOString() ?? null,
    hasPassword: u.passwordHash !== null,
    createdAt: u.createdAt.toISOString(),
    lastSignInAt: u.lastSignInAt?.toISOString() ?? null,
  };
}

export async function recordFailedLogin(user: UserRecord): Promise<UserRecord> {
  const failedLoginCount = user.failedLoginCount + 1;
  const lockedUntil =
    failedLoginCount >= MAX_FAILED_LOGINS
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
      : user.lockedUntil;
  return prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount, lockedUntil },
  });
}

export async function resetFailedLogin(user: UserRecord): Promise<UserRecord> {
  return prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastSignInAt: new Date() },
  });
}

export function isLocked(user: UserRecord): boolean {
  if (!user.lockedUntil) return false;
  return user.lockedUntil.getTime() > Date.now();
}
