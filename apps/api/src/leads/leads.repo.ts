import type { Prisma } from '@prisma/client';
import type { LeadListFilter } from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

/**
 * Lead repo — raw Prisma access. Service layer wraps these with validation,
 * DTO mapping, audit emission, and idempotency logic.
 */

const LEAD_INCLUDE = {
  listing: { select: { id: true, stockNumber: true, titleEn: true } },
  assignedTo: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.LeadInclude;

export type LeadRow = Prisma.LeadGetPayload<{ include: typeof LEAD_INCLUDE }>;

// ─── Build where clause ──────────────────────────────────────────────────────

function buildWhere(filter: LeadListFilter): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};
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

// ─── List / find ────────────────────────────────────────────────────────────

export async function listLeads(
  filter: LeadListFilter,
): Promise<{ rows: LeadRow[]; total: number }> {
  const where = buildWhere(filter);
  const [rows, total] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      include: LEAD_INCLUDE,
      orderBy: [{ createdAt: 'desc' }],
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
    prisma.lead.count({ where }),
  ]);
  return { rows, total };
}

export async function groupCountByStatus(): Promise<{ status: string; count: number }[]> {
  const rows = await prisma.lead.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  return rows.map((r) => ({ status: r.status, count: r._count._all }));
}

export function findLeadById(id: string): Promise<LeadRow | null> {
  return prisma.lead.findUnique({ where: { id }, include: LEAD_INCLUDE });
}

export function findLeadByIdempotencyKey(key: string): Promise<LeadRow | null> {
  return prisma.lead.findUnique({ where: { idempotencyKey: key }, include: LEAD_INCLUDE });
}

// ─── Create / update ────────────────────────────────────────────────────────

export function createLead(
  data: Prisma.LeadUncheckedCreateInput,
): Promise<LeadRow> {
  return prisma.lead.create({ data, include: LEAD_INCLUDE });
}

export function updateLead(
  id: string,
  data: Prisma.LeadUncheckedUpdateInput,
): Promise<LeadRow> {
  return prisma.lead.update({ where: { id }, data, include: LEAD_INCLUDE });
}

// ─── Assignee lookup ─────────────────────────────────────────────────────────

export function findAdminUserById(
  userId: string,
): Promise<{ id: string; fullName: string; email: string | null } | null> {
  return prisma.user.findFirst({
    where: { id: userId, role: 'admin', deletedAt: null },
    select: { id: true, fullName: true, email: true },
  });
}
