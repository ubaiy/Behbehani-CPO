import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Route guard for protected pages (e.g. /account/*).
 *
 * SSR behaviour (v1.5-D9): on the server we don't know who the user is
 * (no localStorage), so we ALLOW activation and let the component handle the
 * hydration state via `auth.isHydrated()`. This prevents the redirect-then-
 * re-allow race that happened when the guard ran SSR-side and saw `false`.
 *
 * Browser behaviour: synchronous check against the localStorage-backed signal.
 * If unauthenticated, redirect to the locale's home with `?signin=1&returnUrl=...`
 * — ShellComponent's existing query-param handler pops the sign-in modal and
 * cleans the URL.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const platformId = inject(PLATFORM_ID);
  // SSR: defer. Component template gates the guest-gate behind isHydrated().
  if (!isPlatformBrowser(platformId)) return true;

  const auth = inject(AuthService);
  if (auth.isSignedIn()) return true;

  const router = inject(Router);
  const locale = state.url.split('/')[1] || 'en';
  return router.parseUrl(
    `/${locale}?signin=1&returnUrl=${encodeURIComponent(state.url)}`,
  );
};
