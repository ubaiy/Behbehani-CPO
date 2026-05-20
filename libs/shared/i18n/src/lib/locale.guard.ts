import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LanguageService } from './language.service';
import { DEFAULT_LOCALE, isLocale } from './locale';

/**
 * Reads `:locale` from the route, validates it, and updates the LanguageService.
 * Redirects to /{DEFAULT_LOCALE}/<rest> for unknown locales.
 */
export const localeGuard: CanActivateFn = (route, state) => {
  const locale = route.paramMap.get('locale');
  const router = inject(Router);
  const language = inject(LanguageService);

  if (isLocale(locale)) {
    language.setLocale(locale);
    return true;
  }

  const rest = state.url.split('/').slice(2).join('/');
  return router.parseUrl(`/${DEFAULT_LOCALE}/${rest}`);
};
