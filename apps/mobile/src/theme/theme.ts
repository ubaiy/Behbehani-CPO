/**
 * Behbehani CPO — Design Tokens (W1 Foundation)
 *
 * Primary brand: Royal Blue (#1E3A8A) + Plus Jakarta Sans.
 * RTL-aware spacing uses `start`/`end` keys (mapped to left/right
 * by the consuming style helpers) so callers never write `marginLeft`
 * directly — always `marginStart`/`marginEnd` via React Native's
 * built-in RTL flip.
 *
 * Light theme only for W1. Dark mode tokens are reserved for W3.
 */

import { I18nManager } from 'react-native';

// ─── Color palette ────────────────────────────────────────────────────────────

export const palette = {
  // Brand
  royalBlue50: '#EFF6FF',
  royalBlue100: '#DBEAFE',
  royalBlue200: '#BFDBFE',
  royalBlue300: '#93C5FD',
  royalBlue400: '#60A5FA',
  royalBlue500: '#3B82F6',
  royalBlue600: '#2563EB',
  royalBlue700: '#1D4ED8',
  royalBlue800: '#1E3A8A', // PRIMARY — Behbehani Royal Blue
  royalBlue900: '#1E2563',

  // Neutrals
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  black: '#000000',

  // Semantic
  successGreen: '#16A34A',
  warningAmber: '#D97706',
  errorRed: '#DC2626',
  infoBlue: '#0284C7',
} as const;

export type PaletteKey = keyof typeof palette;

// ─── Semantic color tokens ────────────────────────────────────────────────────

export const colors = {
  // Brand
  primary: palette.royalBlue800,
  primaryLight: palette.royalBlue100,
  primaryDark: palette.royalBlue900,

  // Backgrounds
  background: palette.white,
  backgroundSubtle: palette.gray50,
  backgroundMuted: palette.gray100,
  surface: palette.white,
  surfaceElevated: palette.white,

  // Text
  textPrimary: palette.gray900,
  textSecondary: palette.gray600,
  textMuted: palette.gray400,
  textInverse: palette.white,
  textOnPrimary: palette.white,

  // Borders
  border: palette.gray200,
  borderFocus: palette.royalBlue800,
  divider: palette.gray100,

  // Interactive
  interactive: palette.royalBlue800,
  interactiveHover: palette.royalBlue700,
  interactiveDisabled: palette.gray300,

  // Status
  success: palette.successGreen,
  warning: palette.warningAmber,
  error: palette.errorRed,
  info: palette.infoBlue,

  // Cards / shadows
  cardBackground: palette.white,
  shadow: palette.black,
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

/**
 * Plus Jakarta Sans is loaded via expo-font in app/_layout.tsx.
 * The weight-specific families map to the correct font file.
 */
export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  // Fallback for system (used before fonts load)
  system: 'System',
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 19,
  xl: 22,
  '2xl': 26,
  '3xl': 30,
  '4xl': 36,
  display: 44,
} as const;

export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

/**
 * Base-4 scale. Use `spacing.X` for padding/margin values.
 * For RTL-aware horizontal spacing use `spacingRTL.start` / `spacingRTL.end`
 * which resolve to the correct physical side based on I18nManager.isRTL.
 */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export type SpacingKey = keyof typeof spacing;

/**
 * RTL-aware horizontal margin/padding helper.
 * Usage:
 *   style={{ ...rtlPaddingH(spacing[4]) }}
 *   // LTR → { paddingLeft: 16, paddingRight: 16 }
 *   // RTL → same (symmetric case)
 *
 *   style={{ ...rtlMarginStart(spacing[4]) }}
 *   // LTR → { marginLeft: 16 }
 *   // RTL → { marginRight: 16 }
 */
export function rtlMarginStart(value: number) {
  return I18nManager.isRTL ? { marginRight: value } : { marginLeft: value };
}

export function rtlMarginEnd(value: number) {
  return I18nManager.isRTL ? { marginLeft: value } : { marginRight: value };
}

export function rtlPaddingStart(value: number) {
  return I18nManager.isRTL ? { paddingRight: value } : { paddingLeft: value };
}

export function rtlPaddingEnd(value: number) {
  return I18nManager.isRTL ? { paddingLeft: value } : { paddingRight: value };
}

// ─── Border radius ────────────────────────────────────────────────────────────

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// ─── Z-index ──────────────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
} as const;

// ─── Composite theme object ───────────────────────────────────────────────────

export const theme = {
  palette,
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
  spacing,
  radius,
  shadows,
  zIndex,
} as const;

export type Theme = typeof theme;
