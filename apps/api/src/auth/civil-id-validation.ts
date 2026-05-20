/**
 * Kuwait Civil ID validation — regex + mod-11 weighted checksum.
 *
 * KW Civil ID format: 12 digits.
 * Checksum algorithm (per V1_4_ROADMAP.md §B-6):
 *   weights = [2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
 *   sum = Σ (digit[i] × weights[i]) for i in 0..10
 *   checkDigit = (11 - (sum % 11)) % 11
 *   valid if checkDigit === digit[11]
 *
 * Pair with mandatory front+back photo upload for human KYC review in the admin
 * queue (v1.4.x). PACI API integration parked v1.8+.
 */

export const KW_CIVIL_ID_REGEX = /^\d{12}$/;

const CIVIL_ID_WEIGHTS = [2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];

/** True if `civilId` is 12 digits AND the mod-11 weighted checksum matches. */
export function isValidKuwaitCivilId(civilId: string): boolean {
  if (!KW_CIVIL_ID_REGEX.test(civilId)) return false;

  const digits = [...civilId].map((c) => Number(c));
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += digits[i] * CIVIL_ID_WEIGHTS[i];
  }
  const checkDigit = (11 - (sum % 11)) % 11;
  return checkDigit === digits[11];
}

/**
 * Zod refine convenience — use as `.refine(isValidKuwaitCivilId, { message: 'Invalid KW Civil ID checksum' })`.
 * Exported for direct reuse by future Zod schemas (loan-app DTO, KYC admin
 * review DTO, etc.) when those flows ship in v1.4.x+.
 */
export const CIVIL_ID_ZOD_REFINE_MESSAGE = 'Invalid KW Civil ID — must be 12 digits with valid checksum';
