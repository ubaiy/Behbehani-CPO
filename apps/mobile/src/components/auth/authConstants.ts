// ─── Brand colour constants (locked palette) ─────────────────────────────────
export const BRAND_700 = '#1D4ED8';
export const BRAND_800 = '#1E3A8A'; // PRIMARY — Behbehani Royal Blue
export const BRAND_900 = '#1E3A8A';

export const SLATE_50 = '#F8FAFC';
export const SLATE_200 = '#E2E8F0';
export const SLATE_300 = '#CBD5E1';
export const SLATE_400 = '#94A3B8';
export const SLATE_500 = '#64748B';
export const SLATE_700 = '#334155';
export const SLATE_900 = '#0F172A';

export const RED_50 = '#FEF2F2';
export const RED_200 = '#FECACA';
export const RED_500 = '#EF4444';
export const RED_600 = '#DC2626';
export const RED_700 = '#B91C1C';

// ─── Password strength helper ─────────────────────────────────────────────────

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export function computePasswordStrength(password: string): PasswordStrength {
  if (password.length < 6) return 'weak';
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return 'fair';
  if (score === 2) return 'good';
  return 'strong';
}

export function strengthColor(s: PasswordStrength): string {
  switch (s) {
    case 'weak':   return RED_500;
    case 'fair':   return SLATE_400;
    case 'good':   return BRAND_700;
    case 'strong': return BRAND_800;
  }
}

// ─── Kuwait mobile validator ──────────────────────────────────────────────────

export function isValidKuwaitMobile(digits: string): boolean {
  return /^[569][0-9]{7}$/.test(digits);
}
