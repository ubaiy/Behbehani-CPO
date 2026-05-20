import { EnvironmentProviders, Provider, inject, provideAppInitializer } from '@angular/core';
import { provideTranslateService, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader, TranslateHttpLoader } from '@ngx-translate/http-loader';
import { LanguageService } from './language.service';
import { DEFAULT_LOCALE } from './locale';

/**
 * Single-call provider for the EN/AR i18n stack.
 * Use in an app's `app.config.ts` providers array.
 *
 * Requires `provideHttpClient(...)` to be configured elsewhere (e.g. via `provideDataAccess(...)`).
 * Translation files are loaded from `/assets/i18n/{locale}.json` of the consuming app.
 */
export function provideI18n(): (Provider | EnvironmentProviders)[] {
  return [
    provideTranslateService({
      fallbackLang: DEFAULT_LOCALE,
      lang: DEFAULT_LOCALE,
      loader: provideTranslateHttpLoader({ prefix: '/assets/i18n/', suffix: '.json' }),
    }),
    provideAppInitializer(() => {
      // Touch LanguageService so it initialises before first render.
      inject(LanguageService);
    }),
  ];
}

export { TranslateModule, TranslateLoader, TranslateHttpLoader };
