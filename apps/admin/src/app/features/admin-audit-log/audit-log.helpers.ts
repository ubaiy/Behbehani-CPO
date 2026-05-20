import type { AuditLogEntryDto, AuditLogFilter } from '@behbehani-cpo/shared-types';

/**
 * Types + pure helpers for the audit-log component. Extracted so the
 * component file stays under the 500-line cap. No Angular wiring — keep
 * this module framework-free.
 */

export type DatePreset = 'today' | 'yesterday' | 'last7d' | 'last30d' | 'custom';
export type DiffTab = 'diff' | 'before' | 'after' | 'raw';
export type SortOption = 'newest' | 'oldest' | 'actor' | 'action';

export interface ActorSuggestion {
  id: string;
  name: string;
  email: string | null;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

export const PAGE_SIZES = [25, 50, 100, 250] as const;

export const DATE_PILLS: Array<{ label: string; value: DatePreset }> = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: 'last7d' },
  { label: 'Last 30 days', value: 'last30d' },
  { label: 'Custom', value: 'custom' },
];

export const DIFF_TABS: Array<{ label: string; value: DiffTab }> = [
  { label: 'Diff', value: 'diff' },
  { label: 'Before', value: 'before' },
  { label: 'After', value: 'after' },
  { label: 'Raw JSON', value: 'raw' },
];

export function defaultAuditFilter(): Partial<AuditLogFilter> {
  return { page: 1, pageSize: 25, sort: 'newest' };
}

export function isoForPreset(preset: DatePreset): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const startOfDay = (d: Date): Date => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const endOfDay = (d: Date): Date => {
    const c = new Date(d);
    c.setHours(23, 59, 59, 999);
    return c;
  };
  switch (preset) {
    case 'today':
      return { dateFrom: startOfDay(now).toISOString(), dateTo: endOfDay(now).toISOString() };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { dateFrom: startOfDay(y).toISOString(), dateTo: endOfDay(y).toISOString() };
    }
    case 'last7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { dateFrom: startOfDay(d).toISOString(), dateTo: endOfDay(now).toISOString() };
    }
    case 'last30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { dateFrom: startOfDay(d).toISOString(), dateTo: endOfDay(now).toISOString() };
    }
    default:
      return {};
  }
}

/**
 * Naive line-by-line diff between two JSON objects. Splits both into
 * pretty-printed lines, then marks lines present only in `before` as removed
 * and only in `after` as added. Intentionally simple — no LCS — sufficient
 * for the structured JSON payloads stored in audit log entries.
 */
export function computeDiff(before: unknown, after: unknown): DiffLine[] {
  const toLines = (v: unknown): string[] =>
    JSON.stringify(v, null, 2).split('\n');

  const beforeLines = toLines(before);
  const afterLines = toLines(after);

  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);

  const result: DiffLine[] = [];
  let bi = 0;
  let ai = 0;

  while (bi < beforeLines.length || ai < afterLines.length) {
    const bLine = beforeLines[bi];
    const aLine = afterLines[ai];

    if (bi >= beforeLines.length) {
      result.push({ type: 'added', text: aLine });
      ai++;
    } else if (ai >= afterLines.length) {
      result.push({ type: 'removed', text: bLine });
      bi++;
    } else if (bLine === aLine) {
      result.push({ type: 'unchanged', text: aLine });
      bi++;
      ai++;
    } else if (!afterSet.has(bLine)) {
      result.push({ type: 'removed', text: bLine });
      bi++;
    } else if (!beforeSet.has(aLine)) {
      result.push({ type: 'added', text: aLine });
      ai++;
    } else {
      result.push({ type: 'removed', text: bLine });
      result.push({ type: 'added', text: aLine });
      bi++;
      ai++;
    }
  }

  return result;
}

export function initialsFromName(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();
}

export function formatAuditTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function formatAuditRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffM = Math.floor(diffMs / 60_000);
  if (diffM < 1) return 'Just now';
  if (diffM < 60) return `${diffM} min ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH} hr${diffH === 1 ? '' : 's'} ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  return `${diffD} days ago`;
}

export function actionChipClassFor(outcome: AuditLogEntryDto['outcome']): string {
  switch (outcome) {
    case 'denied':
      return 'bg-red-50 text-red-700';
    case 'error':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-brand-50 text-brand-700';
  }
}
