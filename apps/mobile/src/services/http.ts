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
