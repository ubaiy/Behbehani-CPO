/**
 * Shared helper functions for VDP sub-components.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

export const TENURE_OPTIONS = [24, 36, 48, 60] as const;
export const DEFAULT_DOWN_PCT = 10;
export const APR = 0.065; // 6.5% placeholder

export function filsToKWD(fils: string | number): number {
  return Number(fils) / 1000;
}

export function formatKWD(fils: string | number): string {
  const kwd = filsToKWD(fils);
  return `KWD ${kwd.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}

export function formatKm(km: number): string {
  return km.toLocaleString('en-US') + ' km';
}

export function maskVIN(vin?: string): string {
  if (!vin || vin.length < 6) return vin ?? '—';
  return `··· ··· ${vin.slice(-6)}`;
}

export function computeMonthly(priceFils: string, downPct: number, tenureMonths: number): string {
  const price = filsToKWD(priceFils);
  const principal = price * (1 - downPct / 100);
  const monthlyRate = APR / 12;
  const monthly =
    monthlyRate === 0
      ? principal / tenureMonths
      : (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return monthly.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}
