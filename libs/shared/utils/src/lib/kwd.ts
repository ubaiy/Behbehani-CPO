/**
 * KWD currency utilities.
 * Per SRS §2.5 + checklist §16: Kuwaiti Dinar uses 3 decimal places.
 */

const FORMATTER_BY_LOCALE = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: 'en' | 'ar'): Intl.NumberFormat {
  const tag = locale === 'ar' ? 'ar-KW' : 'en-KW';
  let f = FORMATTER_BY_LOCALE.get(tag);
  if (!f) {
    f = new Intl.NumberFormat(tag, {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
    FORMATTER_BY_LOCALE.set(tag, f);
  }
  return f;
}

export function formatKwd(amount: number, locale: 'en' | 'ar' = 'en'): string {
  return getFormatter(locale).format(amount);
}
