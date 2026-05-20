import type { InspectionItemStatus, InspectionKind, InspectionStatus } from '@behbehani-cpo/shared-types';

/**
 * Display labels + chip styles shared across queue, edit, and signoff pages.
 *
 * Color tokens follow the admin CPO palette (white + blue) with intentional
 * amber on ADVISORY only — slate-grey would read as "off/unscored" and red is
 * already taken by FAIL. The amber exception is admin-only; the customer-
 * facing storefront uses a slate scale instead.
 */

export const KIND_LABELS: Record<InspectionKind, string> = {
  cpo: 'CPO',
  concierge: 'Concierge',
};

export const KIND_CHIP_CLASS: Record<InspectionKind, string> = {
  cpo: 'bg-slate-100 text-slate-600',
  concierge: 'bg-brand-100 text-brand-800',
};

export const STATUS_LABELS: Record<InspectionStatus, string> = {
  draft: 'Awaiting start',
  in_progress: 'In progress',
  awaiting_inspector_signoff: 'Awaiting sign-off',
  awaiting_customer_signature: 'Awaiting customer sig.',
  signed_off: 'Signed off',
};

export const STATUS_CHIP_CLASS: Record<InspectionStatus, string> = {
  draft:                        'bg-slate-100 text-slate-600',
  in_progress:                  'bg-slate-100 text-slate-600',
  awaiting_inspector_signoff:   'bg-brand-50 text-brand-700',
  awaiting_customer_signature:  'bg-brand-50 text-brand-700',
  signed_off:                   'bg-slate-100 text-slate-700',
};

export const ITEM_STATUS_LABELS: Record<InspectionItemStatus, string> = {
  pass: 'PASS',
  advisory: 'ADVISORY',
  fail: 'FAIL',
};

/**
 * Item-status chip classes — used inside the segmented-control track (see
 * `inspection-item-row.component.ts`). The track itself owns the outer
 * rounded border + slate-50 background; individual chips show a coloured
 * fill when ON and transparent when OFF. No per-chip borders — the track
 * supplies the visual frame, and a `shadow-sm` on the active chip raises
 * it just enough that the user feels the segment they picked.
 */
export const ITEM_STATUS_ON_CLASS: Record<InspectionItemStatus, string> = {
  pass: 'bg-brand-600 text-white shadow-sm',
  advisory: 'bg-amber-400 text-amber-900 shadow-sm',
  fail: 'bg-red-600 text-white shadow-sm',
};

export const ITEM_STATUS_OFF_CLASS =
  'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-white/70';
