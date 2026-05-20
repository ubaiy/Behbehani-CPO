/**
 * Styles for the /reserve/:listingId screen (Task G1).
 * Extracted from the route file so it stays under the 500-line cap.
 *
 * White + Royal Blue brand + slate palette only. Red ONLY for inline error
 * surfaces (parity with web v1.4.11 checkout-modal). NO amber/yellow/gold/
 * emerald/green per CLAUDE.md.
 */

import { StyleSheet } from 'react-native';
import { brand, slate, red } from '../../theme/colors';
import { fontFamily, fontSize, radius, spacing } from '../../theme/theme';

export const reserveStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: slate[100],
    gap: spacing[3],
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnGlyph: {
    fontSize: 22,
    color: slate[700],
    fontFamily: fontFamily.semiBold,
    lineHeight: 24,
  },
  headerTextWrap: { flex: 1 },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: slate[900],
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: slate[500],
    marginTop: 2,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: spacing[8],
  },

  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: brand[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
  },

  methodBtn: {
    minHeight: 54,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodBtnIdle: {
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
  },
  methodBtnSelected: {
    borderColor: brand[700],
    backgroundColor: brand[50],
  },
  methodBtnSoon: {
    borderColor: brand[200],
    backgroundColor: slate[100],
  },
  methodBtnLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: slate[900],
    flex: 1,
  },
  methodBtnLabelSelected: { color: brand[700] },
  methodBtnLabelSoon: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: brand[700],
    flex: 1,
  },
  methodCheckDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodCheckGlyph: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 16,
  },
  soonPill: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: brand[200],
    backgroundColor: slate[100],
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  soonPillText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: brand[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  inlineError: {
    marginTop: spacing[3],
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: '#FEE2E2', // red-100, parity with web bg-red-50
  },
  inlineErrorText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: red[700],
  },
  browseSimilarBtn: {
    marginTop: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
  },
  browseSimilarText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: brand[700],
  },

  primaryCta: {
    minHeight: 48,
    borderRadius: radius.full,
    backgroundColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    marginTop: spacing[5],
  },
  primaryCtaDisabled: { opacity: 0.5 },
  primaryCtaText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
  },
  primaryCtaSmall: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
  },
  secondaryCta: {
    minHeight: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    marginTop: spacing[2],
  },
  secondaryCtaSmall: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
  },
  secondaryCtaText: {
    color: slate[900],
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
  hint: {
    marginTop: spacing[3],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: slate[500],
    textAlign: 'center',
  },

  spinnerBlock: {
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[10],
  },
  spinnerLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: slate[900],
    textAlign: 'center',
  },
  spinnerHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: slate[500],
    textAlign: 'center',
  },

  confirmedCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: slate[50],
    padding: spacing[5],
  },
  confirmedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  confirmedHeaderDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedHeaderGlyph: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 16,
  },
  confirmedHeaderTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: brand[700],
  },
  confirmedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  confirmedRowLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: slate[500],
  },
  confirmedRowValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: slate[900],
    textAlign: 'right',
    flexShrink: 1,
    marginStart: spacing[3],
  },

  redirectingIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  redirectingGlyph: {
    fontSize: 28,
    color: brand[700],
    fontFamily: fontFamily.bold,
    lineHeight: 32,
  },

  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorGlyph: {
    fontSize: 28,
    color: red[700],
    fontFamily: fontFamily.bold,
    lineHeight: 32,
  },
  errorTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: slate[900],
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: slate[500],
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
});
