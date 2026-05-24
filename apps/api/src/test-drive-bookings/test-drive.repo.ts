import type { Prisma } from '@prisma/client';
import type { TestDriveBookingListFilter } from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma.js';

/**
 * Test Drive Booking repo — raw Prisma access. Service layer wraps these with
 * validation, DTO mapping, audit emission, and idempotency logic.
 */

const TEST_DRIVE_INCLUDE = {
  listing:    { select: { id: true, stockNumber: true, titleEn: true } },
  assignedTo: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.TestDriveBookingInclude;

export type TestDriveBookingRow = Prisma.TestDriveBookingGetPayload<{
  include: typeof TEST_DRIVE_INCLUDE;
}>;

// ─── Build where clause ──────────────────────────────────────────────────────

function buildWhere(
  filter: TestDriveBookingListFilter,
): Prisma.TestDriveBookingWhereInput {
  const where: Prisma.TestDriveBookingWhereInput = {};
  if (filter.status) where.status = filter.status;
  if (filter.search && filter.search.length >= 2) {
    where.OR = [
      { customerPhone: { contains: filter.search, mode: 'insensitive' } },
      { customerEmail: { contains: filter.search, mode: 'insensitive' } },
      { customerName:  { contains: filter.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

// ─── List / find ─────────────────────────────────────────────────────────────

export async function listTestDriveBookings(
  filter: TestDriveBookingListFilter,
): Promise<{ rows: TestDriveBookingRow[]; total: number }> {
  const where = buildWhere(filter);
  const [rows, total] = await prisma.$transaction([
    prisma.testDriveBooking.findMany({
      where,
      include: TEST_DRIVE_INCLUDE,
      orderBy: [{ createdAt: 'desc' }],
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
    prisma.testDriveBooking.count({ where }),
  ]);
  return { rows, total };
}

export async function groupCountByStatus(): Promise<
  { status: string; count: number }[]
> {
  const rows = await prisma.testDriveBooking.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  return rows.map((r) => ({ status: r.status, count: r._count._all }));
}

export function findTestDriveBookingById(
  id: string,
): Promise<TestDriveBookingRow | null> {
  return prisma.testDriveBooking.findUnique({
    where: { id },
    include: TEST_DRIVE_INCLUDE,
  });
}

export function findTestDriveBookingByIdempotencyKey(
  key: string,
): Promise<TestDriveBookingRow | null> {
  return prisma.testDriveBooking.findUnique({
    where: { idempotencyKey: key },
    include: TEST_DRIVE_INCLUDE,
  });
}

// ─── Create / update ──────────────────────────────────────────────────────────

export function createTestDriveBooking(
  data: Prisma.TestDriveBookingUncheckedCreateInput,
): Promise<TestDriveBookingRow> {
  return prisma.testDriveBooking.create({ data, include: TEST_DRIVE_INCLUDE });
}

export function updateTestDriveBooking(
  id: string,
  data: Prisma.TestDriveBookingUncheckedUpdateInput,
): Promise<TestDriveBookingRow> {
  return prisma.testDriveBooking.update({
    where: { id },
    data,
    include: TEST_DRIVE_INCLUDE,
  });
}

// ─── Assignee lookup ──────────────────────────────────────────────────────────

export function findAdminUserById(
  userId: string,
): Promise<{ id: string; fullName: string; email: string | null } | null> {
  return prisma.user.findFirst({
    where: { id: userId, role: 'admin', deletedAt: null },
    select: { id: true, fullName: true, email: true },
  });
}
