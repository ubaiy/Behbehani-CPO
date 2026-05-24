import type { Locale } from './locale';

/**
 * Date format style aliases used across the app.
 *
 * - `short`    → DD/MM/YYYY (Gregorian, numeric)
 * - `medium`   → DD Mon YYYY (default account-grid format)
 * - `long`     → DD Month YYYY (formal docs / contracts)
 * - `datetime` → DD Mon YYYY · HH:MM (order timestamps, etc.)
 */
export type FmtDateStyle = 'short' | 'medium' | 'long' | 'datetime';

const LOCALE_TAG: Record<Locale, string> = {
  en: 'en-KW',
  ar: 'ar-KW',
};

const OPTIONS: Record<FmtDateStyle, Intl.DateTimeFormatOptions> = {
  short:    { day: '2-digit', month: '2-digit', year: 'numeric' },
  medium:   { day: '2-digit', month: 'short',   year: 'numeric' },
  long:     { day: 'numeric', month: 'long',    year: 'numeric' },
  datetime: { day: '2-digit', month: 'short',   year: 'numeric', hour: '2-digit', minute: '2-digit' },
};

/**
 * Locale-aware date formatter. Tree-shake friendly, no DI required.
 *
 * @param d       any `Date | string | number | null | undefined` — returns '' on null/undefined/invalid input
 * @param locale  app `Locale` (`'en'` or `'ar'`) — mapped to `en-KW` / `ar-KW` for `Intl.DateTimeFormat`
 * @param style   one of `'short' | 'medium' | 'long' | 'datetime'`. Defaults to `'medium'`.
 *
 * @example
 * fmtDate(order.createdAt, currentLocale(), 'datetime');
 * fmtDate(null, 'en');                  // ''
 * fmtDate('not-a-date', 'en');          // ''
 */
export function fmtDate(
  d: string | number | Date | null | undefined,
  locale: Locale,
  style: FmtDateStyle = 'medium',
): string {
  if (d === null || d === undefined || d === '') return '';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(LOCALE_TAG[locale], OPTIONS[style]).format(date);
  } catch {
    return '';
  }
}
