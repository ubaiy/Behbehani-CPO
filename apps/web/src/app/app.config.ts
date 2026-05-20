import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideDataAccess } from '@behbehani-cpo/data-access';
import { provideI18n } from '@behbehani-cpo/shared-i18n';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideDataAccess({
      baseUrl: '/api/v1',
      // Sign-in is a modal overlay (not a route). On 401 we send the user to
      // the locale home (path only — the interceptor appends `?returnUrl=...`).
      // The Shell listens for either `?signin=1` or `?returnUrl=...` and opens
      // the modal accordingly.
      signInPath: (currentPathname: string) => {
        const seg = currentPathname.split('/')[1];
        const locale = seg === 'en' || seg === 'ar' ? seg : 'en';
        return `/${locale}`;
      },
    }),
    ...provideI18n(),
  ],
};
