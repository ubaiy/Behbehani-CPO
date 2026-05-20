import { slugify, isValidSlug } from './slugify.js';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Mercedes Benz')).toBe('mercedes-benz');
  });

  it('collapses runs of whitespace and punctuation', () => {
    expect(slugify('  Land  Cruiser  ')).toBe('land-cruiser');
    expect(slugify('M & M')).toBe('m-m');
    expect(slugify('Foo___bar---baz')).toBe('foo-bar-baz');
  });

  it('strips leading and trailing dashes', () => {
    expect(slugify('--foo--')).toBe('foo');
    expect(slugify('!!Toyota!!')).toBe('toyota');
  });

  it('drops non-ASCII characters', () => {
    // Arabic input — slugs are EN-derived per design rule, so AR drops entirely.
    expect(slugify('تويوتا')).toBe('');
    // Mixed input keeps only the EN portion.
    expect(slugify('Camry كامري')).toBe('camry');
  });

  it('strips combining accent marks (NFKD decomposes precomposed letters)', () => {
    expect(slugify('Citroën')).toBe('citroen');
    expect(slugify('Škoda')).toBe('skoda');
  });

  it('handles empty and whitespace-only input', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('preserves digits', () => {
    expect(slugify('M3 GT3')).toBe('m3-gt3');
    expect(slugify('Civic 2024')).toBe('civic-2024');
  });
});

describe('isValidSlug', () => {
  it('accepts well-formed slugs', () => {
    expect(isValidSlug('toyota')).toBe(true);
    expect(isValidSlug('mercedes-benz')).toBe(true);
    expect(isValidSlug('m3')).toBe(true);
    expect(isValidSlug('land-cruiser-200')).toBe(true);
  });

  it('rejects malformed slugs', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('Toyota')).toBe(false); // uppercase
    expect(isValidSlug('toyota motor')).toBe(false); // space
    expect(isValidSlug('-toyota')).toBe(false); // leading dash
    expect(isValidSlug('toyota-')).toBe(false); // trailing dash
    expect(isValidSlug('toyota--motor')).toBe(false); // double dash
    expect(isValidSlug('toyota_motor')).toBe(false); // underscore
  });

  it('round-trips with slugify (anything slugify returns is a valid slug)', () => {
    const samples = ['Mercedes Benz', 'Land  Cruiser  ', 'M3 GT3', 'Civic 2024', 'Škoda', 'Citroën'];
    for (const sample of samples) {
      const result = slugify(sample);
      if (result) expect(isValidSlug(result)).toBe(true);
    }
  });
});
