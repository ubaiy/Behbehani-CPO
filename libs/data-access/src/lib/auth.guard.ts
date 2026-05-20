import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isSignedIn()) return true;

  const locale = state.url.split('/')[1] || 'en';
  return router.parseUrl(`/${locale}/auth/sign-in?returnUrl=${encodeURIComponent(state.url)}`);
};
