import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideDataAccess } from '@behbehani-cpo/data-access';
import { appRoutes } from './app.routes';

// provideDataAccess already calls provideHttpClient(withFetch(), withInterceptors([authInterceptor]))
// internally — do NOT call provideHttpClient again here to avoid duplicate providers.
// provideI18n() has been removed — the admin app is English-only.
// provideAnimations() is intentionally NOT installed — the stage modal uses
// the native <dialog> element. If a future component needs Angular animations,
// `npm i @angular/animations@~21.2.0` first, then add `provideAnimations()`.

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideDataAccess({
      baseUrl: '/api/v1',
      // Admin app has a single, locale-agnostic sign-in route.
      signInPath: '/auth/sign-in',
    }),
  ],
};
