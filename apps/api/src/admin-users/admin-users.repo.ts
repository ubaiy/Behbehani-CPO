import type { Prisma, User } from '@prisma/client';
import type { AdminUserFilter } from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

// The User Prisma model has no self-referencing createdById column.
// createdByName is attached manually by the service when needed.
export type AdminUserRow = User & { createdByName?: string | null };

// ─── Where builder ──────────────────────────────────────────────────────────

function buildWhere(filter: AdminUserFilter): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (filter.status === 'active') {
    where.deletedAt = null;
    where.lockedUntil = { lte: new Date() };
  } else if (filter.status === 'locked') {
    where.deletedAt = null;
    where.lockedUntil = { gt: new Date() };
  } else if (filter.status === 'disabled') {
    where.NOT = { deletedAt: null };
  }
  // 'all' → no status filter

  if (filter.hasAdminRoleOnly) {
    where.role = 'admin';
  }

  if (filter.adminRoles && filter.adminRoles.length > 0) {
    // Prisma scalar list filter — cast required because AdminRole[] is a Prisma
    // enum array and the filter type is inferred from the generated client.
    (where as Record<string, unknown>).adminRoles = { hasSome: filter.adminRoles };
  }

  if (filter.q) {
    where.OR = [
      { fullName: { contains: filter.q, mode: 'insensitive' } },
      { email: { contains: filter.q, mode: 'insensitive' } },
      { mobile: { contains: filter.q, mode: 'insensitive' } },
    ];
  }

  return where;
}

function buildOrderBy(sort: AdminUserFilter['sort']): Prisma.UserOrderByWithRelationInput {
  switch (sort) {
    case 'createdAt:asc':
      return { createdAt: 'asc' };
    case 'lastSignInAt:desc':
      return { lastSignInAt: 'desc' };
    case 'fullName:asc':
      return { fullName: 'asc' };
    case 'createdAt:desc':
    default:
      return { createdAt: 'desc' };
  }
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function listAdminUsers(
  filter: AdminUserFilter,
): Promise<{ rows: AdminUserRow[]; total: number }> {
  const where = buildWhere(filter);
  const [rows, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: buildOrderBy(filter.sort),
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return { rows, total };
}

export async function findAdminUserById(id: string): Promise<AdminUserRow | null> {
  return prisma.user.findFirst({ where: { id } });
}

export async function findAdminUserByEmail(
  email: string,
  excludeId?: string,
): Promise<{ id: string } | null> {
  return prisma.user.findFirst({
    where: {
      email: { equals: email, mode: 'insensitive' },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function findAdminUserByMobile(
  mobile: string,
  excludeId?: string,
): Promise<{ id: string } | null> {
  return prisma.user.findFirst({
    where: {
      mobile,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function findCreatorName(createdById: string | null): Promise<string | null> {
  if (!createdById) return null;
  const u = await prisma.user.findFirst({
    where: { id: createdById },
    select: { fullName: true },
  });
  return u?.fullName ?? null;
}

export interface CreateUserInput {
  email?: string | null;
  mobile?: string | null;
  passwordHash: string;
  fullName: string;
  role?: import('@prisma/client').UserRole;
  adminRoles?: import('@prisma/client').AdminRole[];
  locale?: import('@prisma/client').Locale;
}

export async function createAdminUser(data: CreateUserInput): Promise<AdminUserRow> {
  return prisma.user.create({
    data: {
      email: data.email ?? null,
      mobile: data.mobile ?? null,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      role: data.role ?? 'customer',
      adminRoles: (data.adminRoles ?? []) as Prisma.UserCreateInput['adminRoles'],
      locale: data.locale ?? 'en',
    },
  });
}

export async function updateAdminUser(
  id: string,
  data: Prisma.UserUncheckedUpdateInput,
): Promise<AdminUserRow> {
  return prisma.user.update({ where: { id }, data });
}

export async function setAdminUserRoles(
  id: string,
  adminRoles: string[],
): Promise<AdminUserRow> {
  // adminRoles is an AdminRole[] enum array; cast to satisfy Prisma's update input shape.
  return prisma.user.update({
    where: { id },
    data: { adminRoles: { set: adminRoles as import('@prisma/client').AdminRole[] } },
  });
}

export async function lockAdminUser(id: string, lockedUntil: Date): Promise<AdminUserRow> {
  return prisma.user.update({ where: { id }, data: { lockedUntil } });
}

export async function unlockAdminUser(id: string): Promise<AdminUserRow> {
  return prisma.user.update({
    where: { id },
    data: { lockedUntil: null, failedLoginCount: 0 },
  });
}

export async function disableAdminUser(id: string, deletedAt: Date): Promise<AdminUserRow> {
  return prisma.user.update({ where: { id }, data: { deletedAt } });
}

export async function enableAdminUser(id: string): Promise<AdminUserRow> {
  return prisma.user.update({ where: { id }, data: { deletedAt: null } });
}

export async function updateAdminUserPassword(
  id: string,
  passwordHash: string,
): Promise<AdminUserRow> {
  return prisma.user.update({ where: { id }, data: { passwordHash } });
}
