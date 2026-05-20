import type {
  AuditLogEntryDto,
  AuditLogListResponse,
  AuditLogFilter,
  AuditLogExportRequest,
  AuditLogOutcome,
} from '@behbehani-cpo/shared-types';
import { AuditLogError } from './audit-log.errors';
import {
  listAuditLogs,
  countAuditLogsForExport,
  streamAuditLogsForExport,
  getDistinctActions,
  getDistinctResources,
  type AuditLogRow,
} from './audit-log.repo';

const EXPORT_ROW_LIMIT = 10_000;

// ─── Outcome derivation ──────────────────────────────────────────────────────
//
// Priority order (first match wins):
//   1. denied  — action ends with '.failed'  OR  action === 'auth.login.failed'
//   2. error   — action starts with 'error.' OR  action contains '.error'
//   3. success — everything else

export function deriveOutcome(action: string): AuditLogOutcome {
  if (action.endsWith('.failed') || action === 'auth.login.failed') {
    return 'denied';
  }
  if (action.startsWith('error.') || action.includes('.error')) {
    return 'error';
  }
  return 'success';
}

// ─── DTO mapping ─────────────────────────────────────────────────────────────

function rowToDto(row: AuditLogRow): AuditLogEntryDto {
  return {
    id: row.id.toString(),
    actorId: row.actorId ?? null,
    actorName: row.actor?.fullName ?? null,
    actorEmail: row.actor?.email ?? null,
    action: row.action,
    resource: row.resource,
    resourceId: row.resourceId ?? null,
    outcome: deriveOutcome(row.action),
    before: (row.before as unknown) ?? null,
    after: (row.after as unknown) ?? null,
    ip: row.ip ?? null,
    userAgent: row.userAgent ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── List ────────────────────────────────────────────────────────────────────

export async function getAuditLogList(
  filter: AuditLogFilter,
): Promise<AuditLogListResponse> {
  const { rows, total, filteredFrom } = await listAuditLogs(filter);
  return {
    items: rows.map(rowToDto),
    total,
    filteredFrom,
    page: filter.page,
    pageSize: filter.pageSize,
  } satisfies AuditLogListResponse;
}

// ─── Vocabulary ──────────────────────────────────────────────────────────────

export async function getActions(): Promise<{ actions: string[] }> {
  const actions = await getDistinctActions();
  return { actions };
}

export async function getResources(): Promise<{ resources: string[] }> {
  const resources = await getDistinctResources();
  return { resources };
}

// ─── CSV export ──────────────────────────────────────────────────────────────

const CSV_HEADER = 'id,createdAt,actorName,actorEmail,action,resource,resourceId,outcome,ip,userAgent\n';

function escapeCsvField(value: string | null | undefined): string {
  const str = value ?? '';
  // RFC 4180: fields containing commas, double-quotes, or newlines must be
  // enclosed in double-quotes; internal double-quotes are escaped as "".
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsvLine(row: AuditLogRow): string {
  const outcome = deriveOutcome(row.action);
  const fields = [
    row.id.toString(),
    row.createdAt.toISOString(),
    row.actor?.fullName ?? '',
    row.actor?.email ?? '',
    row.action,
    row.resource,
    row.resourceId ?? '',
    outcome,
    row.ip ?? '',
    row.userAgent ?? '',
  ];
  return fields.map(escapeCsvField).join(',') + '\n';
}

export async function buildCsvExport(
  filter: AuditLogExportRequest,
): Promise<{ csv: string; filename: string }> {
  // Count first to enforce the synchronous-export row cap.
  const total = await countAuditLogsForExport(filter);

  if (total > EXPORT_ROW_LIMIT) {
    throw new AuditLogError(
      413,
      `Export would return ${total.toLocaleString()} rows, which exceeds the ` +
        `${EXPORT_ROW_LIMIT.toLocaleString()}-row limit for synchronous CSV export. ` +
        'Please narrow the date range and try again.',
    );
  }

  const rows = await streamAuditLogsForExport(filter);

  let csv = CSV_HEADER;
  for (const row of rows) {
    csv += rowToCsvLine(row);
  }

  const isoDate = new Date().toISOString().slice(0, 10);
  return { csv, filename: `audit-log-${isoDate}.csv` };
}
