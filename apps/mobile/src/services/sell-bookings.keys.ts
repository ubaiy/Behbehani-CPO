/**
 * React Query cache key factory for sell-bookings.
 * Centralised here so both the list route and sub-components can import
 * without creating circular dependencies.
 */

export const sellBookingsKeys = {
  all: ['sell-bookings'] as const,
  list: () => ['sell-bookings', 'list'] as const,
  detail: (bookingRef: string) => ['sell-bookings', 'detail', bookingRef] as const,
};
