import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@behbehani-cpo/data-access';

/**
 * Protects all admin routes.
 * Requires the user to be signed in AND have role === 'admin'.
 * Unauthenticated or non-admin users are redirected to /auth/sign-in.
 */
export const adminAuthGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.user();

  if (!user) {
    return router.parseUrl(
      `/auth/sign-in?returnUrl=${encodeURIComponent(state.url)}`,
    );
  }

  if (user.role !== 'admin') {
    return router.parseUrl(
      `/auth/sign-in?returnUrl=${encodeURIComponent(state.url)}`,
    );
  }

  return true;
};
