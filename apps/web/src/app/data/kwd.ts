const kwdCache = new Map<string, Intl.NumberFormat>();
const kmCache = new Map<string, Intl.NumberFormat>();

function kwdFormatter(locale: 'en' | 'ar'): Intl.NumberFormat {
  const tag = locale === 'ar' ? 'ar-KW' : 'en-KW';
  let f = kwdCache.get(tag);
  if (!f) {
    f = new Intl.NumberFormat(tag, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    kwdCache.set(tag, f);
  }
  return f;
}

function kmFormatter(locale: 'en' | 'ar'): Intl.NumberFormat {
  const tag = locale === 'ar' ? 'ar-KW' : 'en-KW';
  let f = kmCache.get(tag);
  if (!f) {
    f = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 });
    kmCache.set(tag, f);
  }
  return f;
}

export function fmtKwd(value: number, locale: 'en' | 'ar' = 'en'): string {
  const n = kwdFormatter(locale).format(value);
  return locale === 'ar' ? `${n} د.ك` : `KWD ${n}`;
}

export function fmtKm(value: number, locale: 'en' | 'ar' = 'en'): string {
  const n = kmFormatter(locale).format(value);
  return locale === 'ar' ? `${n} كم` : `${n} km`;
}
