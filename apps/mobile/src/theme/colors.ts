/**
 * Behbehani CPO — Brand colour palette constants.
 *
 * Named to match the mockup's Tailwind "brand" + "slate" scales so that
 * component authors can reference these by familiar names.
 *
 * Import priority: prefer this file for colour literals; import semantic
 * tokens (colors, palette) from ./theme for everything else.
 */

export const brand = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#93C5FD',
  400: '#60A5FA',
  500: '#3B82F6',
  600: '#2563EB',
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A',
} as const;

export const slate = {
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
} as const;

/** Red used exclusively for filled-heart / price-drop badge. */
export const red = {
  500: '#EF4444',
  700: '#B91C1C',
} as const;
