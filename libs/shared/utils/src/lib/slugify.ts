/**
 * Slug helpers for the catalog (Brand / Model / BodyType). Pure utilities
 * shared between API (Zod-side default generation, controller-side normalisation)
 * and admin frontend (live preview as the user types the EN name).
 *
 * Rules:
 *  - lowercase ASCII letters + digits + dashes
 *  - collapse runs of whitespace and dashes to a single dash
 *  - strip leading/trailing dashes
 *  - non-ASCII chars are dropped (we don't transliterate Arabic — slugs are
 *    derived from the EN name only, per design rule)
 */

const NON_SLUG_CHARS = /[^a-z0-9]+/g;
const COLLAPSE_DASHES = /-{2,}/g;
const TRIM_DASHES = /^-+|-+$/g;

export function slugify(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining marks (accents)
    .replace(NON_SLUG_CHARS, '-')
    .replace(COLLAPSE_DASHES, '-')
    .replace(TRIM_DASHES, '');
}

/**
 * Server-side validator: a string is a valid slug if it survives a round-trip
 * through `slugify` unchanged. Use in Zod `.refine` to reject malformed user
 * input rather than silently rewriting it.
 */
export function isValidSlug(input: string): boolean {
  return input.length > 0 && slugify(input) === input;
}
