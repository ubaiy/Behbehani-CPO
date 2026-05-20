import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@behbehani-cpo/data-access';
import type { AdminRole } from '@behbehani-cpo/shared-types';

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

/**
 * Factory that returns a CanActivateFn restricting access to the specified
 * admin sub-roles. super_admin always passes (bypasses all role gates).
 * Users that are authenticated but lack the required role are redirected to '/'.
 */
export function adminRoleGuard(allowedRoles: AdminRole[]): CanActivateFn {
  return (_route, _state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const user = auth.user();
    if (!user || user.role !== 'admin') {
      return router.parseUrl('/auth/sign-in');
    }

    const roles = user.adminRoles ?? [];
    if (
      roles.includes('super_admin') ||
      allowedRoles.some((r) => roles.includes(r))
    ) {
      return true;
    }

    // Authenticated admin but missing the required sub-role — redirect to root.
    return router.parseUrl('/');
  };
}
