import { StyleSheet } from 'react-native';
import { colors, fontFamily, spacing, radius } from '../../theme/theme';
import { BRAND_700, BRAND_800, SLATE_400, SLATE_500, SLATE_900 } from './authConstants';

export const screenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    height: 44,
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 28,
    color: SLATE_500,
    lineHeight: 32,
  },
  backChevronRTL: {
    transform: [{ scaleX: -1 }],
  },
  topBarRight: {
    alignItems: 'center',
    gap: spacing[2],
  },
  skipText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: BRAND_700,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
  },
  crestWrapper: {
    alignItems: 'center',
    marginTop: spacing[8],
  },
  crest: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: BRAND_800,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  crestIcon: {
    fontSize: 28,
  },
  brandName: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    color: BRAND_700,
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginTop: 12,
  },
  heading: {
    fontSize: 24,
    fontFamily: fontFamily.bold,
    color: SLATE_900,
    textAlign: 'center',
    marginTop: spacing[6],
  },
  subheading: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: SLATE_500,
    textAlign: 'center',
    marginTop: spacing[1],
    lineHeight: 20,
  },
  dividerRow: {
    alignItems: 'center',
    gap: spacing[3],
    marginVertical: spacing[6],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
    color: SLATE_400,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  toggleLinkRow: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: SLATE_500,
    marginTop: spacing[8],
  },
  toggleLinkAction: {
    fontFamily: fontFamily.bold,
    color: BRAND_700,
  },
  legal: {
    textAlign: 'center',
    fontSize: 10,
    fontFamily: fontFamily.regular,
    color: SLATE_400,
    marginTop: spacing[6],
    lineHeight: 16,
  },
  legalLink: {
    textDecorationLine: 'underline',
  },
});
