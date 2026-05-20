/**
 * useOrderPolling — staged-cadence refetchInterval for Otto callback polling.
 *
 * Task #65 / MOBILE_API_CONTRACT.md v0.11 §4.
 *
 * Cadence (from the moment the detail screen mounts in a polling state):
 *   • First  60 s   → poll every  3 s
 *   • Next   5 min  → poll every 10 s
 *   • After  6 min  → STOP polling; manual refresh only
 *
 * Polling is ONLY active while the order is in a non-terminal state
 * (reservation_pending or payment_pending). Once the status transitions to any
 * terminal value (confirmed/paid/delivery_scheduled/delivered/completed/cancelled)
 * the hook returns `false` so react-query stops the interval immediately.
 *
 * Returned shape is the union react-query's `refetchInterval` accepts:
 *   number | false
 *
 * The hook is intentionally pure-functional (no useEffect / no internal state)
 * — react-query already passes the latest query data each tick, so we derive
 * the next interval deterministically from `(status, elapsedMs)`.
 *
 * Usage in apps/mobile/app/orders/[id].tsx:
 *
 *   const startedAt = useRef(Date.now()).current;
 *   const { data } = useQuery({
 *     queryKey: ['order', id],
 *     queryFn:  () => ordersClient.getById(id),
 *     refetchInterval: (query) =>
 *       getOrderPollInterval(query.state.data?.status, Date.now() - startedAt),
 *   });
 */

import type { OrderStatusValue } from '@behbehani-cpo/shared-types';

/** Status values that indicate an order is still progressing through Otto. */
export const POLLING_STATUSES: ReadonlySet<OrderStatusValue> = new Set<OrderStatusValue>([
  'reservation_pending',
  'payment_pending',
]);

/** Total wall-clock window (ms) before polling is shut off entirely. */
export const POLLING_WINDOW_MS = 6 * 60 * 1000; // 6 min

/** First phase: fast cadence (ms). */
export const POLLING_FAST_INTERVAL_MS = 3 * 1000;

/** Boundary at which the cadence drops from 3 s → 10 s. */
export const POLLING_FAST_PHASE_MS = 60 * 1000;

/** Second phase: slow cadence (ms). */
export const POLLING_SLOW_INTERVAL_MS = 10 * 1000;

/**
 * Returns the next refetch interval for the order detail query.
 *
 * @param status     Current order.status from the latest query result, or undefined
 *                   if the first fetch has not resolved yet (we still want to poll).
 * @param elapsedMs  Wall-clock elapsed since polling started (Date.now() - startedAt).
 *                   The screen captures `startedAt` in a useRef so the value is stable.
 * @returns          A positive ms value to schedule another fetch, or `false` to STOP.
 */
export function getOrderPollInterval(
  status: OrderStatusValue | undefined,
  elapsedMs: number,
): number | false {
  // Terminal state → stop polling. (Manual pull-to-refresh still works.)
  if (status !== undefined && !POLLING_STATUSES.has(status)) {
    return false;
  }

  // Total window exceeded → stop. User can still pull-to-refresh.
  if (elapsedMs >= POLLING_WINDOW_MS) {
    return false;
  }

  // Phase 1: first 60s, fast cadence.
  if (elapsedMs < POLLING_FAST_PHASE_MS) {
    return POLLING_FAST_INTERVAL_MS;
  }

  // Phase 2: 60s..6min, slow cadence.
  return POLLING_SLOW_INTERVAL_MS;
}

/**
 * Convenience predicate — true when the given status is still cancellable from
 * the customer side. Used by the detail screen to enable/disable the Cancel CTA
 * after a 409 race resolves the order into a terminal state.
 *
 * v1.4.2 §3 semantics:
 *   - reservation_pending → cancellable (no payment in flight yet)
 *   - payment_pending     → cancellable (will return 409 if Otto is past hold-stage)
 *   - everything else     → NOT cancellable
 */
export function isOrderCancellable(status: OrderStatusValue | undefined): boolean {
  if (status === undefined) return false;
  return POLLING_STATUSES.has(status);
}
