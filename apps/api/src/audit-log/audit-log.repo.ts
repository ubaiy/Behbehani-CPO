import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import type { AuditLogFilter } from '@behbehani-cpo/shared-types';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AuditLogRow = Prisma.AuditLogGetPayload<{
  include: { actor: { select: { fullName: true; email: true } } };
}>;

// ─── Where builder ───────────────────────────────────────────────────────────

/**
 * Translates the outcome filter value into the action-pattern WHERE clause.
 * - 'denied'  → action ends with '.failed' OR equals 'auth.login.failed'
 * - 'error'   → action starts with 'error.' OR contains '.error'
 * - 'success' → negation of the two above
 * - 'all'     → no constraint
 */
function outcomeToActionWhere(
  outcome: AuditLogFilter['outcome'],
): Prisma.AuditLogWhereInput | undefined {
  if (!outcome || outcome === 'all') return undefined;

  if (outcome === 'denied') {
    return {
      OR: [
        { action: { endsWith: '.failed' } },
        { action: 'auth.login.failed' },
      ],
    };
  }

  if (outcome === 'error') {
    return {
      OR: [
        { action: { startsWith: 'error.' } },
        { action: { contains: '.error' } },
      ],
    };
  }

  // 'success': exclude both denied and error patterns
  return {
    AND: [
      { action: { not: { endsWith: '.failed' } } },
      { action: { not: 'auth.login.failed' } },
      { action: { not: { startsWith: 'error.' } } },
      { action: { not: { contains: '.error' } } },
    ],
  };
}

function buildWhere(filter: AuditLogFilter): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (filter.actorId) {
    where.actorId = filter.actorId;
  }

  if (filter.actorQ) {
    const q = filter.actorQ;
    where.actor = {
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { mobile: { contains: q, mode: 'insensitive' } },
      ],
    };
  }

  if (filter.action) {
    where.action = filter.action;
  } else if (filter.actionPrefix) {
    where.action = { startsWith: filter.actionPrefix };
  }

  if (filter.resource) {
    where.resource = filter.resource;
  }

  if (filter.resourceId) {
    where.resourceId = filter.resourceId;
  }

  const outcomePart = outcomeToActionWhere(filter.outcome);
  if (outcomePart) {
    // Merge with existing action constraint if present
    if (where.action) {
      // wrap both in AND
      where.AND = [{ action: where.action }, outcomePart];
      delete where.action;
    } else {
      Object.assign(where, outcomePart);
    }
  }

  const createdAt: Prisma.DateTimeFilter = {};
  if (filter.dateFrom) createdAt.gte = new Date(filter.dateFrom);
  if (filter.dateTo) createdAt.lte = new Date(filter.dateTo);
  if (filter.dateFrom || filter.dateTo) where.createdAt = createdAt;

  return where;
}

function buildOrderBy(
  sort: AuditLogFilter['sort'],
): Prisma.AuditLogOrderByWithRelationInput {
  switch (sort) {
    case 'oldest':
      return { createdAt: 'asc' };
    case 'actor':
      return { actor: { fullName: 'asc' } };
    case 'action':
      return { action: 'asc' };
    default:
      return { createdAt: 'desc' };
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

const ACTOR_SELECT = {
  select: { fullName: true, email: true },
} as const;

export async function listAuditLogs(filter: AuditLogFilter): Promise<{
  rows: AuditLogRow[];
  total: number;
  filteredFrom: number;
}> {
  const where = buildWhere(filter);
  const skip = (filter.page - 1) * filter.pageSize;

  const [rows, total, filteredFrom] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: buildOrderBy(filter.sort),
      skip,
      take: filter.pageSize,
      include: { actor: ACTOR_SELECT },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count(), // bare count — no filter
  ]);

  return { rows, total, filteredFrom };
}

export async function countAuditLogsForExport(
  filter: Omit<AuditLogFilter, 'page' | 'pageSize'>,
): Promise<number> {
  const where = buildWhere({ ...filter, page: 1, pageSize: 1, sort: 'newest' });
  return prisma.auditLog.count({ where });
}

export async function streamAuditLogsForExport(
  filter: Omit<AuditLogFilter, 'page' | 'pageSize'>,
): Promise<AuditLogRow[]> {
  const where = buildWhere({ ...filter, page: 1, pageSize: 1, sort: 'newest' });
  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { actor: ACTOR_SELECT },
  });
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export async function getDistinctActions(): Promise<string[]> {
  const since = new Date(Date.now() - NINETY_DAYS_MS);
  const rows = await prisma.auditLog.findMany({
    where: { createdAt: { gte: since } },
    select: { action: true },
    distinct: ['action'],
    orderBy: { action: 'asc' },
    take: 200,
  });
  return rows.map((r) => r.action);
}

export async function getDistinctResources(): Promise<string[]> {
  const since = new Date(Date.now() - NINETY_DAYS_MS);
  const rows = await prisma.auditLog.findMany({
    where: { createdAt: { gte: since } },
    select: { resource: true },
    distinct: ['resource'],
    orderBy: { resource: 'asc' },
    take: 200,
  });
  return rows.map((r) => r.resource);
}
