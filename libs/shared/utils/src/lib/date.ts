/**
 * Date utilities — DD/MM/YYYY per Kuwait convention (checklist §16).
 */

export function formatDate(input: Date | string | number, locale: 'en' | 'ar' = 'en'): string {
  const d = input instanceof Date ? input : new Date(input);
  const tag = locale === 'ar' ? 'ar-KW' : 'en-GB';
  return new Intl.DateTimeFormat(tag, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}
