/**
 * Constants + i18n maps for the /reserve/:listingId screen (Task G1).
 * Extracted from the route file so it stays under the 500-line cap.
 *
 * Mirrors the same maps used by web v1.4.11 checkout-modal.component.ts so
 * a user switching between mobile/web sees consistent error copy.
 */

import type { PaymentMethodValue } from '@behbehani-cpo/shared-types';

/** PaymentMethodValue → i18n key under `checkout.modal.method.*`. */
export const METHOD_LABELS: Record<PaymentMethodValue, string> = {
  knet:              'checkout.modal.method.knet',
  card:              'checkout.modal.method.card',
  apple_pay:         'checkout.modal.method.applePay',
  google_pay:        'checkout.modal.method.googlePay',
  bank_transfer:     'checkout.modal.method.card', // unused on customer reserve
  financing:         'checkout.modal.method.card',
  cash_on_delivery:  'checkout.modal.method.card',
};

/** Server `error.code` → i18n key under `checkout.modal.error.*`. */
export const ERROR_MAP: Record<string, string> = {
  LISTING_ALREADY_RESERVED: 'checkout.modal.error.alreadyReserved',
  LISTING_NOT_AVAILABLE:    'checkout.modal.error.notAvailable',
  RESERVATION_EXPIRED:      'checkout.modal.error.reservationExpired',
  ORDER_NOT_CANCELLABLE:    'checkout.modal.error.generic',
  PAYMENT_INIT_FAILED:      'checkout.modal.error.paymentInitFailed',
  PAYMENT_NOT_FOUND:        'checkout.modal.error.generic',
  IDEMPOTENCY_KEY_REQUIRED: 'checkout.modal.error.generic',
  unauthenticated:          'checkout.modal.error.unauthenticated',
  network_error:            'checkout.modal.error.networkError',
};

/** Active payment methods (selectable). */
export const ACTIVE_METHODS: readonly PaymentMethodValue[] = ['knet', 'card'] as const;

/** Disabled methods — tapping shows the "Coming soon" alert. */
export const COMING_SOON_METHODS: readonly PaymentMethodValue[] = [
  'apple_pay',
  'google_pay',
] as const;
