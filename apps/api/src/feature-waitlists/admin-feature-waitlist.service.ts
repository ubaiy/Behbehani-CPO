import type {
  AdminFeatureWaitlistListFilterDto,
  AdminFeatureWaitlistListResponseDto,
  AdminFeatureWaitlistExportFilterDto,
  AdminFeatureWaitlistPathCounts,
} from '@behbehani-cpo/shared-types';
import { WAITLIST_EXPORT_MAX_ROWS } from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma.js';

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * Paginated list of feature-waitlist subscribers with per-path counts.
 *
 * pathCounts is computed across ALL rows (independent of the search filter)
 * so the UI filter chips always show global totals.
 */
export async function listFeatureWaitlistEntries(
  filter: AdminFeatureWaitlistListFilterDto,
): Promise<AdminFeatureWaitlistListResponseDto> {
  const { featurePath, search, page, pageSize } = filter;

  // ── Where clause for the paginated query ──────────────────────────────────
  const where: Parameters<typeof prisma.featureWaitlist.findMany>[0]['where'] = {};

  if (featurePath) {
    where.featurePath = featurePath;
  }

  if (search) {
    const term = search.trim();
    where.OR = [
      { email:       { contains: term, mode: 'insensitive' } },
      { featurePath: { contains: term, mode: 'insensitive' } },
    ];
  }

  // ── Parallel: paginated rows + total count + global path counts ───────────
  const [rows, total, rawPathCounts] = await Promise.all([
    prisma.featureWaitlist.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      select:  {
        id:          true,
        featurePath: true,
        email:       true,
        userId:      true,
        createdAt:   true,
      },
    }),
    prisma.featureWaitlist.count({ where }),
    // pathCounts: group by featurePath across ALL rows (no search filter)
    prisma.featureWaitlist.groupBy({
      by:     ['featurePath'],
      _count: { _all: true },
      orderBy: { featurePath: 'asc' },
    }),
  ]);

  const pathCounts: AdminFeatureWaitlistPathCounts = {};
  for (const row of rawPathCounts) {
    pathCounts[row.featurePath] = row._count._all;
  }

  return {
    items: rows.map((r) => ({
      id:          r.id,
      featurePath: r.featurePath,
      email:       r.email,
      userId:      r.userId,
      createdAt:   r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    pathCounts,
  };
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export interface ExportResult {
  csv:      string;
  capHit:   boolean;   // true when row count was clamped to WAITLIST_EXPORT_MAX_ROWS
  rowCount: number;
}

/**
 * CSV export of feature-waitlist entries.
 *
 * Columns: id, featurePath, email, userId, createdAt
 *
 * Safety:
 *  - Max WAITLIST_EXPORT_MAX_ROWS rows hard cap; capHit=true when clamped.
 *  - Every cell is CSV-escaped: commas/quotes/newlines are wrapped in double-
 *    quotes, inner double-quotes are doubled ("").
 *  - CSV injection prevention (OWASP): cells starting with = + - @ are prefixed
 *    with a single-quote ' so spreadsheet apps don't execute them as formulas.
 */
export async function exportFeatureWaitlistCsv(
  filter: AdminFeatureWaitlistExportFilterDto,
): Promise<ExportResult> {
  const where: Parameters<typeof prisma.featureWaitlist.findMany>[0]['where'] = {};
  if (filter.featurePath) {
    where.featurePath = filter.featurePath;
  }

  const rows = await prisma.featureWaitlist.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take:    WAITLIST_EXPORT_MAX_ROWS + 1,  // fetch one extra to detect cap hit
    select:  {
      id:          true,
      featurePath: true,
      email:       true,
      userId:      true,
      createdAt:   true,
    },
  });

  const capHit    = rows.length > WAITLIST_EXPORT_MAX_ROWS;
  const capped    = capHit ? rows.slice(0, WAITLIST_EXPORT_MAX_ROWS) : rows;

  const headers = ['id', 'featurePath', 'email', 'userId', 'createdAt'];
  const lines: string[] = [headers.join(',')];

  for (const row of capped) {
    const cells = [
      row.id,
      row.featurePath,
      row.email,
      row.userId ?? '',
      row.createdAt.toISOString(),
    ];
    lines.push(cells.map(csvCell).join(','));
  }

  return {
    csv:      lines.join('\r\n'),
    capHit,
    rowCount: capped.length,
  };
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

/**
 * Escape a single CSV cell value.
 *
 * Rules:
 *  1. If the value contains a comma, double-quote, or newline — wrap in double-quotes
 *     and double any inner double-quotes.
 *  2. OWASP CSV injection guard: if the first character is one of = + - @ then
 *     prefix the cell value with a single-quote ' before quoting.
 */
function csvCell(value: string): string {
  // Step 1: CSV injection guard
  let safe = value;
  if (safe.length > 0 && ['=', '+', '-', '@'].includes(safe[0])) {
    safe = `'${safe}`;
  }

  // Step 2: wrap in double-quotes if the value needs escaping
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n') || safe.includes('\r')) {
    safe = `"${safe.replace(/"/g, '""')}"`;
  }

  return safe;
}
