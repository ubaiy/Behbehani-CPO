/**
 * Shared utilities for the customer-facing orders flow (Task #65).
 *
 * Kept in a single file so both the list and detail screens share the same
 * money/VIN/status helpers — no risk of drift.
 */

import type { OrderStatusValue } from '@behbehani-cpo/shared-types';
import { brand, slate, red } from '../../theme/colors';

// ─── Money ────────────────────────────────────────────────────────────────────

/**
 * Format fils (BigInt-as-string) → KWD 3-decimal display string.
 *   "4850000" → "KWD 4,850.000"
 *
 * Hard-constraint per Task #65 + Behbehani brand: 3 decimals everywhere money shows.
 */
export function formatKwd(fils: string | number): string {
  const n = typeof fils === 'string' ? parseInt(fils, 10) : fils;
  if (!Number.isFinite(n)) return 'KWD —';
  const kwd = n / 1000;
  return `KWD ${kwd.toLocaleString('en-KW', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}`;
}

// ─── VIN masking ──────────────────────────────────────────────────────────────

/**
 * Mask all but the last 6 chars of a VIN. Customer surfaces never show the full
 * VIN even though the server returns it; mobile masks client-side — same rule
 * the inspection viewer follows.
 *   "1HGCM82633A123456" → "•••••••••••123456"
 */
export function maskVin(vin: string | undefined | null): string {
  if (!vin) return '';
  if (vin.length <= 6) return vin;
  return '•'.repeat(vin.length - 6) + vin.slice(-6);
}

// ─── Status pill ──────────────────────────────────────────────────────────────

export interface StatusPillStyle {
  bg: string;
  fg: string;
  label: string;
}

/**
 * Maps the raw server enum (v1.4.2 §3) to the palette.
 * Brand-only + slate. Red ONLY for cancelled/failed (destructive). No
 * amber/yellow/gold/emerald/green per Task #65 + CLAUDE.md global rule.
 *
 * The label field is a fallback used for a11y labels. StatusPill resolves
 * the displayed label via t('orders.statusPill.*') independently.
 */
export function getStatusPillStyle(status: OrderStatusValue): StatusPillStyle {
  switch (status) {
    case 'reservation_pending':
      // "pending" bucket — neutral slate.
      return { bg: slate[100], fg: slate[700], label: 'Pending' };
    case 'payment_pending':
      // "processing" bucket — brand-tinted to signal forward motion.
      return { bg: brand[100], fg: brand[700], label: 'Processing' };
    case 'confirmed':
      return { bg: brand[100], fg: brand[700], label: 'Confirmed' };
    case 'paid':
      return { bg: brand[100], fg: brand[700], label: 'Paid' };
    case 'delivery_scheduled':
      return { bg: brand[100], fg: brand[700], label: 'Delivery scheduled' };
    case 'delivered':
      return { bg: brand[100], fg: brand[900], label: 'Delivered' };
    case 'completed':
      return { bg: brand[100], fg: brand[900], label: 'Completed' };
    case 'cancelled':
      return { bg: slate[100], fg: slate[500], label: 'Cancelled' };
    default:
      // Defensive — exhaustive switch above covers the enum but keep a fallback.
      return { bg: slate[100], fg: slate[700], label: status };
  }
}

/**
 * True when the payment summary indicates a hard failure that should be
 * surfaced separately from order.status. The pill turns red-500 in that case.
 */
export function hasFailedPayment(
  payments: ReadonlyArray<{ status: 'pending' | 'succeeded' | 'failed' | 'refunded' }> | undefined,
): boolean {
  return !!payments?.some((p) => p.status === 'failed');
}

export const FAILED_PILL: StatusPillStyle = {
  bg: '#FEE2E2', // red-100 (only place outside the destructive button)
  fg: red[500],
  label: 'Payment failed',
};

// ─── Date ─────────────────────────────────────────────────────────────────────

/** ISO → "Mon, 19 May 2026" — short readable date. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-KW', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

// ─── Idempotency key ──────────────────────────────────────────────────────────

/**
 * Generates a per-attempt idempotency key for the cancel POST (CONCIERGE v1.4.3 §6).
 * Mobile bundle does not currently ship `expo-crypto`, so we use a Date.now() +
 * Math.random() composite. The server treats this as an opaque string ≤ 200 chars.
 */
export function newIdempotencyKey(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `mob-cancel-${ts}-${rand}`;
}
