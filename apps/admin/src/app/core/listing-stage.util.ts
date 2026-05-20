import type { ListingStage } from '@behbehani-cpo/shared-types';

/**
 * Human-readable labels for each pipeline stage.
 * Used in chips, dropdowns, and stage-change modals across the admin app.
 */
export const STAGE_LABELS: Record<ListingStage, string> = {
  acquired: 'Acquired',
  inbound: 'Inbound',
  inspection: 'Inspection',
  photoshoot: 'Photoshoot',
  reconditioning: 'Reconditioning',
  listed: 'Listed',
  reserved: 'Reserved',
  sold: 'Sold',
  delivered: 'Delivered',
  closed: 'Closed',
};

/**
 * Tailwind pill classes per stage.
 * Palette is intentionally limited to blue/slate/emerald/red tints — no amber.
 */
export const STAGE_CHIP_CLASS: Record<ListingStage, string> = {
  acquired: 'bg-slate-100 text-slate-700',
  inbound: 'bg-slate-200 text-slate-800',
  inspection: 'bg-blue-50 text-blue-700',
  photoshoot: 'bg-blue-100 text-blue-800',
  reconditioning: 'bg-blue-200 text-blue-900',
  listed: 'bg-emerald-50 text-emerald-700',
  reserved: 'bg-emerald-100 text-emerald-800',
  sold: 'bg-emerald-200 text-emerald-900',
  delivered: 'bg-slate-50 text-slate-600',
  closed: 'bg-red-50 text-red-700',
};

/**
 * Returns the Tailwind classes for an aging chip based on days on lot.
 * - < 20 days: no chip (return empty string)
 * - 20–44 days: blue warning
 * - 45+ days: red alert
 */
export function agingChipClass(days: number): string {
  if (days >= 45) return 'bg-red-50 text-red-700';
  if (days >= 20) return 'bg-blue-50 text-blue-700';
  return '';
}
