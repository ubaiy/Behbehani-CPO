/**
 * @behbehani-cpo/data-access-mobile — public API surface.
 *
 * All clients accept an AxiosInstance constructor arg.
 * The app-level http.ts (apps/mobile/src/services/http.ts) injects its instance.
 *
 * Import pattern in apps/mobile:
 *   import { AuthApiClient, ListingsPublicApiClient } from '@behbehani-cpo/data-access-mobile';
 */

export { AuthApiClient } from './lib/auth.client';
export { ListingsPublicApiClient } from './lib/listings-public.client';
export { InspectionsPublicApiClient } from './lib/inspections-public.client';
export { NotificationsPublicApiClient } from './lib/notifications.client';
export { OrdersPublicApiClient } from './lib/orders.client';
export { MeInspectionsApiClient } from './lib/me-inspections.client';
export { MeDocumentsApiClient } from './lib/me-documents.client';
export { MeSavedSearchesApiClient } from './lib/me-saved-searches.client';
export { MeAccountApiClient } from './lib/me-account.client';
export type { AddressListResponse } from './lib/me-account.client';
export { MeSavedListingsApiClient } from './lib/me-saved-listings.client';
export { MeNotificationsApiClient } from './lib/me-notifications.client';
export { OffersPublicApiClient } from './lib/offers-public.client';
export { MeMaintenanceApiClient } from './lib/me-maintenance.client';
export { MeReviewsApiClient } from './lib/me-reviews.client';
export { ListingReviewsApiClient } from './lib/listing-reviews.client';
export { MeSessionsApiClient } from './lib/me-sessions.client';
export type { SessionSummaryDto, SessionListResponse } from './lib/me-sessions.client';
export { MeNotificationPrefsApiClient } from './lib/me-notification-prefs.client';
export type { UpdateNotificationPrefsInput } from './lib/me-notification-prefs.client';
export {
  MeSellBookingsApiClient,
  CancelBookingNotFoundError,
  CancelBookingNotCancellableError,
  CancelBookingValidationError,
} from './lib/me-sell-bookings.client';
export type { RescheduleBookingDto } from './lib/me-sell-bookings.client';

export type {
  InspectionSignTokenResponse,
  SubmitSignatureDto,
  SubmitSignatureResponse,
} from './lib/inspections-public.client';

export type { OfferRespondResponse } from './lib/offers-public.client';
