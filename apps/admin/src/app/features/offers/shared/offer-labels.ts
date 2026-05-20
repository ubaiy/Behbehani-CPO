import type { OfferStatus } from '@behbehani-cpo/shared-types';

/**
 * Display labels + chip styles for offer statuses.
 *
 * Palette per §16 D7 (mockups README DQ2):
 * - accepted:             slate-100 / slate-700  (resolved/neutral — NOT green)
 * - sent:                 amber-50 / amber-700    (pending/awaiting customer)
 * - countered_by_customer: brand-100 / brand-800  (needs admin action)
 * - countered_by_admin:  brand-100 / brand-800    (needs customer action — same blue family)
 * - declined:            red-50 / red-600          (terminal negative)
 * - expired:             red-50 / red-600          (terminal negative)
 * - drafted:             slate-100 / slate-500     (neutral draft)
 * - withdrawn:           slate-100 / slate-500     (neutral terminal)
 */

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  drafted: 'Drafted',
  sent: 'Sent',
  countered_by_customer: 'Countered by customer',
  countered_by_admin: 'Countered by admin',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
};

export const OFFER_STATUS_CHIP_CLASS: Record<OfferStatus, string> = {
  drafted:              'bg-slate-100 text-slate-500 border-slate-200',
  sent:                 'bg-amber-50 text-amber-700 border-amber-200',
  countered_by_customer:'bg-brand-100 text-brand-800 border-brand-200',
  countered_by_admin:   'bg-brand-100 text-brand-800 border-brand-200',
  accepted:             'bg-slate-100 text-slate-700 border-slate-200',
  declined:             'bg-red-50 text-red-600 border-red-200',
  expired:              'bg-red-50 text-red-600 border-red-200',
  withdrawn:            'bg-slate-100 text-slate-500 border-slate-200',
};

/** Terminal statuses — no admin actions possible on an offer in these states. */
export const OFFER_TERMINAL_STATUSES: ReadonlySet<OfferStatus> = new Set([
  'accepted',
  'declined',
  'expired',
  'withdrawn',
]);
