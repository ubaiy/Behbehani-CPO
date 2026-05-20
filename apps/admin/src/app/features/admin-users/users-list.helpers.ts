import type { AdminUserFilter } from '@behbehani-cpo/shared-types';

/**
 * Pure helpers + constants for users-list.component.ts. Extracted so the
 * component file stays under the 500-line cap. No Angular wiring — keep
 * this file framework-free.
 */

export const PAGE_SIZES = [10, 25, 50, 100] as const;

export type StatusFilter = 'all' | 'active' | 'locked' | 'disabled';
export const STATUS_FILTERS: StatusFilter[] = ['all', 'active', 'locked', 'disabled'];

export function defaultUsersFilter(): Partial<AdminUserFilter> {
  return { page: 1, pageSize: 25, status: 'all', sort: 'createdAt:desc' };
}

/** Compute initials from a full name (max 2 chars). */
export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Relative-time helper shared between list rows and drawer copy. */
export function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffMs / 86_400_000);
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD} days ago`;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}
