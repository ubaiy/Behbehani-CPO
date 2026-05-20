import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import type {
  AdminUserCreate,
  AdminUserUpdate,
  AdminUserAssignRoles,
  AdminUserDetailDto,
  AdminUserSummaryDto,
  AdminUserListResponse,
  AdminUserCreateResponse,
  AdminUserResetPasswordResponse,
  AdminUserFilter,
  UserStatus,
} from '@behbehani-cpo/shared-types';
import { recordAudit } from '../middleware/audit';
import { AdminUserError } from './admin-users.errors';
import type { AdminUserRow } from './admin-users.repo';
import {
  listAdminUsers,
  findAdminUserById,
  findAdminUserByEmail,
  findAdminUserByMobile,
  findCreatorName,
  createAdminUser,
  updateAdminUser,
  setAdminUserRoles,
  lockAdminUser,
  unlockAdminUser,
  disableAdminUser,
  enableAdminUser,
  updateAdminUserPassword,
  type CreateUserInput,
} from './admin-users.repo';

// ─── Constants ──────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const LOCK_DURATION_YEARS = 10;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generatePassword(): string {
  // 9 bytes → 12 base64url chars (no +/= padding issues)
  return crypto.randomBytes(9).toString('base64url');
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function deriveStatus(row: AdminUserRow): UserStatus {
  if (row.deletedAt !== null) return 'disabled';
  if (row.lockedUntil && row.lockedUntil.getTime() > Date.now()) return 'locked';
  return 'active';
}

function toSummary(row: AdminUserRow): AdminUserSummaryDto {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    mobile: row.mobile,
    role: row.role as AdminUserSummaryDto['role'],
    adminRoles: (row.adminRoles ?? []) as AdminUserSummaryDto['adminRoles'],
    status: deriveStatus(row),
    emailVerifiedAt: row.emailVerifiedAt ? row.emailVerifiedAt.toISOString() : null,
    mobileVerifiedAt: row.mobileVerifiedAt ? row.mobileVerifiedAt.toISOString() : null,
    lockedUntil: row.lockedUntil ? row.lockedUntil.toISOString() : null,
    failedLoginCount: row.failedLoginCount,
    lastSignInAt: row.lastSignInAt ? row.lastSignInAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function toDetail(row: AdminUserRow): Promise<AdminUserDetailDto> {
  // The User table has no createdById column in the current schema.
  // createdById/createdByName are populated only when the caller attaches them
  // via row.createdByName (from a manual join). Otherwise both are null.
  const createdById = (row as AdminUserRow & { createdById?: string | null }).createdById ?? null;
  const createdByName =
    row.createdByName !== undefined
      ? (row.createdByName ?? null)
      : await findCreatorName(createdById);

  return {
    ...toSummary(row),
    locale: row.locale as AdminUserDetailDto['locale'],
    createdByName,
    createdById,
  };
}

// ─── Service functions ──────────────────────────────────────────────────────

export async function listUsers(filter: AdminUserFilter): Promise<AdminUserListResponse> {
  const { rows, total } = await listAdminUsers(filter);
  return {
    items: rows.map(toSummary),
    total,
    page: filter.page,
    pageSize: filter.pageSize,
  };
}

export async function getUser(id: string): Promise<AdminUserDetailDto> {
  const row = await findAdminUserById(id);
  if (!row) throw new AdminUserError(404, 'User not found');
  return toDetail(row);
}

export async function createUser(
  dto: AdminUserCreate,
  actorId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<AdminUserCreateResponse> {
  // Uniqueness check
  if (dto.email) {
    const conflict = await findAdminUserByEmail(dto.email);
    if (conflict) throw new AdminUserError(409, 'Email already in use');
  }
  if (dto.mobile) {
    const conflict = await findAdminUserByMobile(dto.mobile);
    if (conflict) throw new AdminUserError(409, 'Mobile already in use');
  }

  let plainPassword: string;
  let generatedPassword: string | null = null;

  if (dto.passwordMode === 'generate') {
    plainPassword = generatePassword();
    generatedPassword = plainPassword;
  } else {
    plainPassword = dto.password!;
  }

  const passwordHash = await hashPassword(plainPassword);

  const input: CreateUserInput = {
    email: dto.email,
    mobile: dto.mobile,
    passwordHash,
    fullName: dto.fullName,
    role: dto.accountType as CreateUserInput['role'],
    adminRoles: dto.adminRoles as CreateUserInput['adminRoles'],
    locale: dto.locale as CreateUserInput['locale'],
  };
  const row = await createAdminUser(input);

  const user = await toDetail(row);

  await recordAudit({
    actorId,
    action: 'user.create',
    resource: 'admin.users',
    resourceId: user.id,
    after: {
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      adminRoles: user.adminRoles,
    },
    ip,
    userAgent,
  });

  return { user, generatedPassword };
}

export async function updateUser(
  id: string,
  dto: AdminUserUpdate,
  actorId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<AdminUserDetailDto> {
  const before = await findAdminUserById(id);
  if (!before) throw new AdminUserError(404, 'User not found');

  if (dto.email && dto.email !== before.email) {
    const conflict = await findAdminUserByEmail(dto.email, id);
    if (conflict) throw new AdminUserError(409, 'Email already in use');
  }
  if (dto.mobile && dto.mobile !== before.mobile) {
    const conflict = await findAdminUserByMobile(dto.mobile, id);
    if (conflict) throw new AdminUserError(409, 'Mobile already in use');
  }

  const row = await updateAdminUser(id, {
    ...(dto.fullName !== undefined && { fullName: dto.fullName }),
    ...(dto.email !== undefined && { email: dto.email }),
    ...(dto.mobile !== undefined && { mobile: dto.mobile }),
    ...(dto.locale !== undefined && { locale: dto.locale }),
  });

  const user = await toDetail(row);

  await recordAudit({
    actorId,
    action: 'user.update',
    resource: 'admin.users',
    resourceId: id,
    before: {
      fullName: before.fullName,
      email: before.email,
      mobile: before.mobile,
      locale: before.locale,
    },
    after: {
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      locale: user.locale,
    },
    ip,
    userAgent,
  });

  return user;
}

export async function assignRoles(
  id: string,
  dto: AdminUserAssignRoles,
  actorId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<AdminUserDetailDto> {
  const before = await findAdminUserById(id);
  if (!before) throw new AdminUserError(404, 'User not found');

  // Self-protection: cannot strip own super_admin
  if (id === actorId && !dto.adminRoles.includes('super_admin')) {
    throw new AdminUserError(422, 'You cannot remove your own super_admin role');
  }

  const previousRoles = (before.adminRoles ?? []) as string[];
  const row = await setAdminUserRoles(id, dto.adminRoles as string[]);
  const user = await toDetail(row);

  await recordAudit({
    actorId,
    action: 'user.roles.assigned',
    resource: 'admin.users',
    resourceId: id,
    before: { adminRoles: previousRoles },
    after: { adminRoles: dto.adminRoles },
    ip,
    userAgent,
  });

  return user;
}

export async function lockUser(
  id: string,
  actorId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<AdminUserDetailDto> {
  if (id === actorId) {
    throw new AdminUserError(422, 'You cannot lock your own account');
  }

  const before = await findAdminUserById(id);
  if (!before) throw new AdminUserError(404, 'User not found');

  // Idempotent: already locked → 200 no-op
  const alreadyLocked = before.lockedUntil && before.lockedUntil.getTime() > Date.now();
  if (alreadyLocked) return toDetail(before);

  const lockedUntil = new Date();
  lockedUntil.setFullYear(lockedUntil.getFullYear() + LOCK_DURATION_YEARS);

  const row = await lockAdminUser(id, lockedUntil);
  const user = await toDetail(row);

  await recordAudit({
    actorId,
    action: 'user.lock',
    resource: 'admin.users',
    resourceId: id,
    before: { status: 'active' },
    after: { status: 'locked', lockedUntil: lockedUntil.toISOString() },
    ip,
    userAgent,
  });

  return user;
}

export async function unlockUser(
  id: string,
  actorId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<AdminUserDetailDto> {
  const before = await findAdminUserById(id);
  if (!before) throw new AdminUserError(404, 'User not found');

  // Idempotent: not locked → 200 no-op
  const isLocked = before.lockedUntil && before.lockedUntil.getTime() > Date.now();
  if (!isLocked) return toDetail(before);

  const row = await unlockAdminUser(id);
  const user = await toDetail(row);

  await recordAudit({
    actorId,
    action: 'user.unlock',
    resource: 'admin.users',
    resourceId: id,
    before: { status: 'locked' },
    after: { status: 'active', lockedUntil: null, failedLoginCount: 0 },
    ip,
    userAgent,
  });

  return user;
}

export async function disableUser(
  id: string,
  actorId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<AdminUserDetailDto> {
  if (id === actorId) {
    throw new AdminUserError(422, 'You cannot disable your own account');
  }

  const before = await findAdminUserById(id);
  if (!before) throw new AdminUserError(404, 'User not found');

  // Idempotent: already disabled → 200 no-op
  if (before.deletedAt !== null) return toDetail(before);

  const deletedAt = new Date();
  const row = await disableAdminUser(id, deletedAt);
  const user = await toDetail(row);

  await recordAudit({
    actorId,
    action: 'user.disable',
    resource: 'admin.users',
    resourceId: id,
    before: { status: 'active' },
    after: { status: 'disabled', deletedAt: deletedAt.toISOString() },
    ip,
    userAgent,
  });

  return user;
}

export async function enableUser(
  id: string,
  actorId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<AdminUserDetailDto> {
  const before = await findAdminUserById(id);
  if (!before) throw new AdminUserError(404, 'User not found');

  // Idempotent: already enabled → 200 no-op
  if (before.deletedAt === null) return toDetail(before);

  const row = await enableAdminUser(id);
  const user = await toDetail(row);

  await recordAudit({
    actorId,
    action: 'user.enable',
    resource: 'admin.users',
    resourceId: id,
    before: { status: 'disabled' },
    after: { status: 'active', deletedAt: null },
    ip,
    userAgent,
  });

  return user;
}

export async function resetPassword(
  id: string,
  mode: 'generate' | 'manual',
  manualPassword: string | undefined,
  actorId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<AdminUserResetPasswordResponse> {
  const before = await findAdminUserById(id);
  if (!before) throw new AdminUserError(404, 'User not found');

  let plainPassword: string;
  let generatedPassword: string | null = null;

  if (mode === 'generate') {
    plainPassword = generatePassword();
    generatedPassword = plainPassword;
  } else {
    plainPassword = manualPassword!;
  }

  const passwordHash = await hashPassword(plainPassword);
  await updateAdminUserPassword(id, passwordHash);

  // NEVER log the password value — only log that a reset occurred
  await recordAudit({
    actorId,
    action: 'user.password.reset',
    resource: 'admin.users',
    resourceId: id,
    before: { passwordChanged: false },
    after: { passwordChanged: true, mode },
    ip,
    userAgent,
  });

  return { generatedPassword, requireChangeOnNextSignIn: true };
}
