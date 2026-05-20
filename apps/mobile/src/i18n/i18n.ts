/**
 * i18next configuration for Behbehani CPO mobile (W1).
 *
 * Behaviour:
 *  - On first launch, derives locale from expo-localization (device setting).
 *  - User's explicit choice is persisted to expo-secure-store under LOCALE_KEY.
 *  - On app start the persisted value wins over the device locale.
 *  - Switching to Arabic calls I18nManager.forceRTL(true) and requests a reload.
 *    The reload is handled by the caller (app/_layout.tsx) via Updates.reloadAsync.
 *  - Falls back to English if the device locale is unsupported.
 */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';

import { storage } from '../services/storage';

import en from './locales/en.json';
import ar from './locales/ar.json';

export type SupportedLocale = 'en' | 'ar';
export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'ar'];
const LOCALE_KEY = 'user.locale';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
} as const;

/**
 * Reads the persisted locale from secure store.
 * Returns null if nothing is stored or the stored value is invalid.
 */
async function getPersistedLocale(): Promise<SupportedLocale | null> {
  const stored = await storage.getItem(LOCALE_KEY);
  if (stored && (SUPPORTED_LOCALES as string[]).includes(stored)) {
    return stored as SupportedLocale;
  }
  return null;
}

/**
 * Derives locale from device settings (expo-localization).
 * Falls back to 'en' if the device language is not in SUPPORTED_LOCALES.
 */
function getDeviceLocale(): SupportedLocale {
  const locales = getLocales();
  const deviceLang = locales[0]?.languageCode ?? 'en';
  return (SUPPORTED_LOCALES as string[]).includes(deviceLang)
    ? (deviceLang as SupportedLocale)
    : 'en';
}

/**
 * Applies RTL layout direction for Arabic.
 * Call this on app start (before the first render) and after locale changes.
 * A reload is required for I18nManager changes to take full effect — the
 * caller is responsible for triggering `Updates.reloadAsync()`.
 */
export function applyRTL(locale: SupportedLocale): void {
  const shouldBeRTL = locale === 'ar';
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.forceRTL(shouldBeRTL);
    I18nManager.allowRTL(shouldBeRTL);
  }
}

/**
 * Persists the locale choice and changes the active i18next language.
 * Also applies the RTL direction flag.
 */
export async function setLocale(locale: SupportedLocale): Promise<void> {
  await storage.setItem(LOCALE_KEY, locale);
  applyRTL(locale);
  await i18next.changeLanguage(locale);
}

/**
 * Initialises i18next. Call once, early in app/_layout.tsx before the
 * first render (await this before rendering children).
 */
export async function initI18n(): Promise<void> {
  const persisted = await getPersistedLocale();
  const locale = persisted ?? getDeviceLocale();

  // Apply RTL direction before i18next init so the first render is correct.
  applyRTL(locale);

  if (i18next.isInitialized) {
    // If already initialised (fast-refresh), just sync the language.
    if (i18next.language !== locale) {
      await i18next.changeLanguage(locale);
    }
    return;
  }

  await i18next.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: 'en',
    interpolation: {
      // React already escapes values — no need for i18next to do it.
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });
}

export default i18next;
