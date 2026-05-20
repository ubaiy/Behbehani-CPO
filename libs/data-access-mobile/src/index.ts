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

export type {
  InspectionSignTokenResponse,
  SubmitSignatureDto,
  SubmitSignatureResponse,
} from './lib/inspections-public.client';
