import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  share,
  switchMap,
  throwError,
} from 'rxjs';
import { AuthService } from './auth.service';
import { API_CONFIG, type ApiConfig } from './api-config';
import type { AuthSession } from '@behbehani-cpo/shared-types';

/**
 * Attaches the bearer token to outbound API requests.
 *
 * - Skips the Authorization header for external URLs (e.g. direct-to-S3 presigned
 *   PUTs) so MinIO/S3 do not receive our JWT — presigned URLs are self-authorizing.
 * - Proactively refreshes the access token when it has expired but a refresh
 *   token is available, before sending the request. Avoids an extra round-trip.
 * - On 401 from non-credential endpoints: triggers a single-flight refresh and
 *   retries the original request with the new token. If refresh fails the
 *   session is cleared and the user is redirected to the sign-in path.
 * - SSR-safe: navigation + window access are skipped when not running in a browser.
 */

// Single-flight refresh state — module-level so it is shared across all
// concurrent interceptor calls within the same event loop.
let isRefreshing = false;
let refresh$: Observable<AuthSession | null> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const config = inject(API_CONFIG);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);

  // External URLs (e.g. S3 presigned PUTs) bypass token attachment entirely
  // and never reach the catchError path below.
  if (!req.url.startsWith(config.baseUrl)) return next(req);

  // Auth credential endpoints must NOT carry a stale token and must NOT
  // trigger the refresh-on-401 path — let the form surface its own inline error.
  // /auth/refresh is also excluded: a 401 there means the refresh token is dead,
  // which is handled by auth.refresh() itself (signs out + throws).
  if (isCredentialEndpoint(req.url)) return next(req);

  const token = auth.readAccessToken();

  // Proactive expiry: if the stored token has expired but we have a refresh
  // token, refresh silently before sending the request. This avoids the
  // 401 → refresh → retry round-trip on every request after token expiry.
  if (auth.isTokenExpired() && auth.readRefreshToken() && !isRefreshing) {
    return doRefresh(auth).pipe(
      switchMap(() => {
        const freshToken = auth.readAccessToken();
        const forwardReq = freshToken ? addBearer(req, freshToken) : req;
        return next(forwardReq).pipe(
          catchError((error: unknown) =>
            handleError(error, req, next, auth, config, router, isBrowser),
          ),
        );
      }),
    );
  }

  const authedReq = token ? addBearer(req, token) : req;

  return next(authedReq).pipe(
    catchError((error: unknown) =>
      handleError(error, req, next, auth, config, router, isBrowser),
    ),
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addBearer(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function doRefresh(auth: AuthService): Observable<AuthSession | null> {
  if (!refresh$) {
    isRefreshing = true;
    refresh$ = auth.refresh().pipe(
      share(),
      finalize(() => {
        isRefreshing = false;
        refresh$ = null;
      }),
    );
  }
  return refresh$;
}

function handleError(
  error: unknown,
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  config: ApiConfig,
  router: Router,
  isBrowser: boolean,
): Observable<HttpEvent<unknown>> {
  if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
    return throwError(() => error);
  }

  // If a refresh is already in-flight, join it and retry when done.
  if (isRefreshing && refresh$) {
    return refresh$.pipe(
      switchMap(() => {
        const freshToken = auth.readAccessToken();
        return freshToken ? next(addBearer(req, freshToken)) : next(req);
      }),
    );
  }

  // Kick off a new refresh and retry this request on success.
  return doRefresh(auth).pipe(
    switchMap((session) => {
      if (!session) {
        // Refresh returned null — no refresh token was stored.
        redirectToSignIn(auth, config, router, isBrowser);
        return throwError(() => error);
      }
      return next(addBearer(req, session.accessToken));
    }),
    catchError((refreshErr) => {
      // Refresh call itself failed (e.g. 401 from /auth/refresh).
      // auth.refresh() already called signOut() internally.
      redirectToSignIn(auth, config, router, isBrowser);
      return throwError(() => refreshErr);
    }),
  );
}

function redirectToSignIn(
  auth: AuthService,
  config: ApiConfig,
  router: Router,
  isBrowser: boolean,
): void {
  auth.signOut().subscribe();

  if (!isBrowser) return;

  const currentPath = window.location.pathname;
  const signInPath = resolveSignInPath(config.signInPath, currentPath);

  // Guard against redirect loops.
  const onSignInPage =
    currentPath === signInPath ||
    currentPath.endsWith('/auth/sign-in') ||
    currentPath === '/sign-in';

  if (!onSignInPage) {
    const returnUrl = currentPath + window.location.search;
    void router.navigateByUrl(`${signInPath}?returnUrl=${encodeURIComponent(returnUrl)}`);
  }
}

function resolveSignInPath(
  configured: string | ((currentPathname: string) => string) | undefined,
  currentPathname: string,
): string {
  if (typeof configured === 'function') return configured(currentPathname);
  if (typeof configured === 'string') return configured;
  return '/sign-in';
}

/**
 * Endpoints where a 401 means "wrong credentials / wrong OTP / expired refresh"
 * rather than "expired access token". The interceptor must NOT enter the
 * refresh-on-401 loop for these — the callers handle errors inline.
 */
function isCredentialEndpoint(url: string): boolean {
  return (
    url.endsWith('/auth/login') ||
    url.endsWith('/auth/register') ||
    url.endsWith('/auth/refresh') ||
    url.endsWith('/auth/otp/request') ||
    url.endsWith('/auth/otp/verify')
  );
}
