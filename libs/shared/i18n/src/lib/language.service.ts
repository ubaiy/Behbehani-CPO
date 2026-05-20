import { DOCUMENT, Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { DEFAULT_LOCALE, Locale, SUPPORTED_LOCALES, directionFor, isLocale } from './locale';

const STORAGE_KEY = 'cpo.locale';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly _current = signal<Locale>(DEFAULT_LOCALE);
  readonly current = this._current.asReadonly();

  constructor(
    private readonly translate: TranslateService,
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {
    this.translate.addLangs([...SUPPORTED_LOCALES]);
    this.translate.setFallbackLang(DEFAULT_LOCALE);
    this.setLocale(this.readInitialLocale());
  }

  setLocale(locale: Locale): void {
    if (!isLocale(locale)) return;
    this._current.set(locale);
    this.translate.use(locale);
    const root = this.document.documentElement;
    root.setAttribute('lang', locale);
    root.setAttribute('dir', directionFor(locale));
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(STORAGE_KEY, locale);
      } catch {
        // ignore storage errors (private mode, quota, etc.)
      }
    }
  }

  toggle(): void {
    this.setLocale(this._current() === 'en' ? 'ar' : 'en');
  }

  private readInitialLocale(): Locale {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (isLocale(stored)) return stored;
      } catch {
        // ignore
      }
    }
    return DEFAULT_LOCALE;
  }
}
