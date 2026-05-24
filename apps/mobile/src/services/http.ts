/**
 * Axios HTTP client — Behbehani CPO mobile (W1).
 *
 * Exports:
 *   httpClient      — intercepted instance (auth headers + 401-refresh). Use for
 *                     all authenticated and most unauthenticated API calls.
 *   rawHttpClient   — plain instance WITHOUT the 401-refresh interceptor. Use for:
 *                     • /v1/auth/login and /v1/auth/refresh (prevent infinite loop)
 *                     • /v1/public/inspection-sign/:token (no-auth deep-link route)
 *
 * Data-access-mobile clients (instantiated below):
 *   authApiClient           — wraps rawHttpClient (login/refresh bypass interceptors)
 *   listingsPublicApiClient — wraps httpClient (compatible with either — GET only)
 *   inspectionsPublicApiClient — wraps rawHttpClient (no-auth route, see comment)
 *
 * REFRESH-TOKEN RACE PROTECTION:
 *   Concurrent 401 responses (e.g. two parallel API calls with an expired token)
 *   must share a single in-flight refresh call. Without this, each 401 fires its own
 *   refresh, the responses overwrite each other in SecureStore, and all but the last
 *   caller get a stale token. We store the in-flight promise as a module-level
 *   singleton; any concurrent 401 awaits the same promise and gets the same session.
 *
 * AUTHORIZATION HEADER REDACTION:
 *   Before re-throwing any error, we strip `config.headers.Authorization` from the
 *   AxiosError so that if Sentry (W4) is attached, it never captures a raw Bearer
 *   token. The token is already short-lived (15 min) but defence-in-depth.
 */

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { AuthService } from './auth';
import { storage } from './storage';
import { queryClient } from './queryClient';
import {
  AuthApiClient,
  ListingsPublicApiClient,
  InspectionsPublicApiClient,
  OrdersPublicApiClient,
  MeInspectionsApiClient,
  MeDocumentsApiClient,
  MeSavedSearchesApiClient,
  OffersPublicApiClient,
  MeAccountApiClient,
  MeSavedListingsApiClient,
  MeNotificationsApiClient,
  MeMaintenanceApiClient,
  MeReviewsApiClient,
  ListingReviewsApiClient,
  MeSessionsApiClient,
  MeNotificationPrefsApiClient,
  MeSellBookingsApiClient,
} from '@behbehani-cpo/data-access-mobile';

// ─── React Query singleton ────────────────────────────────────────────────────
// Imported from `./queryClient` — same instance used by PersistQueryClientProvider
// in app/_layout.tsx. Sharing this instance is essential: the TOKEN_REUSED
// handler below calls `queryClient.clear()` and that MUST evict the entries the
// React tree is subscribed to. (Pre-#43 these were two separate clients and
// `clear()` was a silent no-op on user data.)

// ─── Sentinel flag ────────────────────────────────────────────────────────────
// Marks a retried request so the 401 interceptor does not retry a second time.
const RETRY_FLAG = '__cpo_retried';

interface RetryableConfig extends InternalAxiosRequestConfig {
  [RETRY_FLAG]?: boolean;
}

// ─── Single-flight refresh promise ────────────────────────────────────────────
// Shared across all concurrent 401 handlers on the intercepted instance.
// Cleared (set to null) once the refresh settles (success or failure).
let _refreshInFlight: Promise<import('./auth').SessionShape> | null = null;

function getOrStartRefresh(): Promise<import('./auth').SessionShape> {
  if (!_refreshInFlight) {
    _refreshInFlight = AuthService.refreshAccessToken().finally(() => {
      _refreshInFlight = null;
    });
  }
  return _refreshInFlight;
}

// ─── Authorization header redactor ───────────────────────────────────────────
// Strips Bearer token from error config before propagation.
// Pre-emptive defence so Sentry (W4) cannot capture raw tokens.
function redactAuthHeader(error: AxiosError): void {
  if (error.config?.headers) {
    error.config.headers['Authorization'] = '[REDACTED]';
  }
}

// ─── Custom User-Agent ────────────────────────────────────────────────────────
// Format: BehbehaniCPO/{iOS|Android}/{appVersion}
// Set on all three clients (rawHttpClient + both intercepted instances).
// MOBILE_API_CONTRACT.md v0.4 §4

const APP_VERSION: string =
  (Constants.expoConfig?.version as string | undefined) ?? '0.0.0';

const USER_AGENT = `BehbehaniCPO/${
  Platform.OS === 'ios' ? 'iOS' : 'Android'
}/${APP_VERSION}`;

// ─── Base URL ─────────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  const baseURL = process.env['EXPO_PUBLIC_API_URL'];
  if (!baseURL) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set. Add it to your .env.local and rebuild.',
    );
  }
  return baseURL.replace(/\/$/, '');
}

// ─── Raw (non-intercepted) instance ──────────────────────────────────────────
// Used for /login, /refresh, and no-auth routes like /inspection-sign/:token.

export const rawHttpClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': USER_AGENT,
  },
});

// ─── TOKEN_REUSED forced sign-out ────────────────────────────────────────────
// TOKEN_REUSED handler — MOBILE_API_CONTRACT.md v0.4 §4
// Envelope shape is placeholder pending B-C-1 confirmation

async function handleTokenReused(): Promise<void> {
  // a. Clear both refresh token keys from SecureStore.
  await Promise.all([
    storage.removeItem('auth.refreshToken'),
    storage.removeItem('cpo.auth.refresh'),
  ]);

  // b. Invalidate the react-query cache so stale authenticated data is removed.
  queryClient.clear();

  // c. Navigate to sign-in — replace so the user cannot navigate back.
  router.replace('/auth/sign-in');

  // d. Toast — no toast library detected; console.warn as placeholder.
  // TODO (W3): Replace with toast notification when toast library is integrated.
  console.warn('[http] TOKEN_REUSED — Signed out for your security — please sign in again.');
}

// ─── Intercepted instance factory ─────────────────────────────────────────────

function createHttpClient(): AxiosInstance {
  const client = axios.create({
    baseURL: getBaseUrl(),
    timeout: 15_000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  });

  // ─── Request interceptor ──────────────────────────────────────────────────
  // Attaches Authorization: Bearer <accessToken> from SecureStore.
  // No token → header omitted (unauthenticated request).

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await AuthService.getAccessToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });

  // ─── Response interceptor ─────────────────────────────────────────────────
  // On 401: attempt single-flight token refresh, replay original request once.
  // On second 401 (after refresh): clear session, re-throw (auth guard redirects).
  //
  // TOKEN_REUSED handler — MOBILE_API_CONTRACT.md v0.4 §4
  // Envelope shape is placeholder pending B-C-1 confirmation

  client.interceptors.response.use(
    (response) => response,

    async (error: AxiosError) => {
      const originalConfig = error.config as RetryableConfig | undefined;

      if (error.response?.status === 401) {
        // TOKEN_REUSED: security-signal 401 — entire session is revoked.
        // Do NOT attempt refresh; clear session and redirect immediately.
        if (
          (error.response.data as { error?: { code?: string } } | undefined)
            ?.error?.code === 'TOKEN_REUSED'
        ) {
          redactAuthHeader(error);
          // Fire-and-forget — do not await to avoid blocking the rejection chain.
          void handleTokenReused();
          return Promise.reject(error);
        }

        // Normal token-expiry 401: attempt single-flight refresh, replay once.
        if (originalConfig && !originalConfig[RETRY_FLAG]) {
          originalConfig[RETRY_FLAG] = true;

          try {
            // Single-flight: concurrent 401s share one refresh call.
            const session = await getOrStartRefresh();

            // Patch the Authorization header on the original request config.
            originalConfig.headers?.set('Authorization', `Bearer ${session.accessToken}`);

            // Retry the original request with the refreshed token.
            return await client.request(originalConfig as AxiosRequestConfig);
          } catch (refreshError) {
            // Refresh failed — AuthService.refreshAccessToken() already called
            // signOut(). Redact header then re-throw so auth guard can redirect.
            if (refreshError instanceof AxiosError) {
              redactAuthHeader(refreshError);
            }
            redactAuthHeader(error);
            return Promise.reject(error);
          }
        }
      }

      // All other errors — redact header and pass through unchanged.
      redactAuthHeader(error);
      return Promise.reject(error);
    },
  );

  return client;
}

export const httpClient: AxiosInstance = createHttpClient();

// ─── Data-access-mobile client instances ─────────────────────────────────────
// These are singletons — constructed once, shared across the app.
// Inject whichever axios instance matches the auth requirements of the endpoint.

/**
 * Auth client uses the RAW instance to avoid circular interceptor loops.
 * /v1/auth/login and /v1/auth/refresh must not go through the 401-refresh interceptor.
 */
export const authApiClient = new AuthApiClient(rawHttpClient);

/**
 * Listings client uses the intercepted instance.
 * Public GET endpoints are unauthenticated but benefit from auth headers when
 * the user is signed in (e.g. for personalized results in future sprints).
 */
export const listingsPublicApiClient = new ListingsPublicApiClient(httpClient);

/**
 * Inspections-sign client uses the RAW instance.
 * The /v1/public/inspection-sign/:token route is no-auth and must NOT trigger
 * the 401-refresh interceptor — an absent Bearer token is expected and valid here.
 * See ARCHITECTURE.md §4: "This route MUST NOT trigger the auth interceptor's 401-redirect."
 */
export const inspectionsPublicApiClient = new InspectionsPublicApiClient(rawHttpClient);

/**
 * Orders client uses the intercepted instance — all order endpoints are
 * authenticated and benefit from the single-flight 401-refresh interceptor.
 * Task #65 / MOBILE_API_CONTRACT.md v0.11 §4-§5.
 */
export const ordersPublicApiClient = new OrdersPublicApiClient(httpClient);

/**
 * Me-inspections client uses the intercepted instance — the /v1/public/me/*
 * namespace is authenticated despite the "public" prefix (established convention).
 * Task v0.16 / MOBILE_API_CONTRACT.md v0.15-B-roadmap §2.
 */
export const meInspectionsApiClient = new MeInspectionsApiClient(httpClient);

/**
 * Me-documents client uses the intercepted instance — the /v1/public/me/*
 * namespace is authenticated despite the "public" prefix (established convention).
 * Task v0.17 / MOBILE_API_CONTRACT.md v1.5.2-roadmap §3.
 */
export const meDocumentsApiClient = new MeDocumentsApiClient(httpClient);

/**
 * Me-saved-searches client uses the intercepted instance — the /v1/public/me/*
 * namespace is authenticated despite the "public" prefix (established convention).
 * v1.5.3 — 5 CRUD endpoints wired to the saved-search feature.
 */
export const meSavedSearchesApiClient = new MeSavedSearchesApiClient(httpClient);

/**
 * Offers public client uses the RAW instance.
 * /v1/public/concierge/offers/:token is gated by the shared-link token in the
 * path, not Bearer auth — an absent token should not redirect to sign-in.
 * Same pattern as inspectionsPublicApiClient. v0.18.a wires the 5 mobile offer
 * state screens to real fetched data and closes the v0.16 carry-over (use
 * `offer.inspectionReportId` in place of the hardcoded mock test-id).
 * See: apps/mobile/app/offers/[token]/view.tsx
 */
export const offersPublicApiClient = new OffersPublicApiClient(rawHttpClient);

/**
 * Me-account client uses the intercepted instance — profile + address CRUD.
 * Task v0.18.b / me-account.schemas.ts / GET+PATCH /v1/public/me/profile
 * and GET/POST/PATCH/DELETE /v1/public/me/addresses.
 */
export const meAccountApiClient = new MeAccountApiClient(httpClient);

/**
 * Me-saved-listings client uses the intercepted instance — favourites CRUD.
 * Task v0.18.b / saved-listings.public.schemas.ts / GET/POST/DELETE
 * /v1/public/me/saved-listings[/:listingId].
 */
export const meSavedListingsApiClient = new MeSavedListingsApiClient(httpClient);

/**
 * Me-notifications client uses the intercepted instance — notifications inbox.
 * Task v0.19.a / MOBILE_API_CONTRACT.md v1.5.6 §1.
 * All 5 endpoints: list, unread-count, mark-read, mark-all-read, delete.
 */
export const meNotificationsApiClient = new MeNotificationsApiClient(httpClient);

/**
 * Me-maintenance client uses the intercepted instance — maintenance pickup CRUD.
 * Task v0.19.b / MOBILE_API_CONTRACT.md v1.5.6 §2.
 * All 5 endpoints: list (filterable by status), getById, create (Idempotency-Key),
 * update (PATCH), delete (204).
 */
export const meMaintenanceApiClient = new MeMaintenanceApiClient(httpClient);

/**
 * Me-reviews client uses the intercepted instance — customer review CRUD.
 * Task v0.19.c / MOBILE_API_CONTRACT.md v1.5.6 §3.
 * 3 endpoints: list my reviews, create (Idempotency-Key), delete (204).
 */
export const meReviewsApiClient = new MeReviewsApiClient(httpClient);

/**
 * Listing-reviews client uses the RAW instance (no-auth invariant).
 * /v1/public/listings/:id/reviews is a fully public endpoint — no Bearer token
 * is expected or required. Using rawHttpClient ensures the 401-refresh interceptor
 * is never triggered on this route. Same pattern as offersPublicApiClient and
 * inspectionsPublicApiClient.
 * Task v0.19.c / MOBILE_API_CONTRACT.md v1.5.6 §3.
 */
export const listingReviewsApiClient = new ListingReviewsApiClient(rawHttpClient);

/**
 * Me-sessions client uses the intercepted instance — active sessions management.
 * Task v0.22.a / MOBILE_API_CONTRACT.md v1.5.x §session-management.
 * 3 endpoints: list, revoke single session (DELETE), sign-out-all (POST).
 */
export const meSessionsApiClient = new MeSessionsApiClient(httpClient);

/**
 * Me-notification-prefs client uses the intercepted instance — notification preferences.
 * Task v0.22.a / CONCIERGE_INSPECTION_API_CONTRACT.md v1.3.0 §6.1.
 * 2 endpoints: GET + PATCH /v1/public/me/notification-preferences.
 */
export const meNotificationPrefsApiClient = new MeNotificationPrefsApiClient(httpClient);

/**
 * Me-sell-bookings client uses the intercepted instance — sell-concierge booking CRUD.
 * Task v0.22.b / STATUS.md API row: `/v1/public/sell-bookings (3 endpoints)`.
 * Endpoints: list (paginated), getByRef, reschedule (PATCH), cancel (POST /cancel — B v1.5.14).
 */
export const meSellBookingsApiClient = new MeSellBookingsApiClient(httpClient);
