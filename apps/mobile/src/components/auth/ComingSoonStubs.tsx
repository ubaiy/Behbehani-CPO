import { View, Text, StyleSheet, Pressable, Platform, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily, spacing, radius } from '../../theme/theme';
import { SLATE_50, SLATE_200, SLATE_400, SLATE_500 } from './authConstants';

export function ComingSoonStubs() {
  const { t } = useTranslation();
  const rtlRow = I18nManager.isRTL ? 'row-reverse' : 'row';

  return (
    <View style={styles.stubGroup}>
      {/* OTP */}
      <View style={styles.stubButtonWrapper}>
        <Pressable style={styles.stubButton} disabled accessibilityLabel={t('auth.comingSoonOtp')}>
          <View style={[styles.stubButtonInner, { flexDirection: rtlRow }]}>
            <Text style={styles.stubIcon}>📱</Text>
            <Text style={styles.stubButtonText}>{t('auth.continueWithMobile')}</Text>
          </View>
        </Pressable>
        <View style={styles.comingSoonPill}>
          <Text style={styles.comingSoonText}>{t('auth.comingSoon')}</Text>
        </View>
      </View>

      {/* Google */}
      <View style={styles.stubButtonWrapper}>
        <Pressable style={styles.stubButton} disabled accessibilityLabel={t('auth.continueWithGoogleA11y')}>
          <View style={[styles.stubButtonInner, { flexDirection: rtlRow }]}>
            <Text style={styles.stubIcon}>G</Text>
            <Text style={styles.stubButtonText}>{t('auth.continueWithGoogle')}</Text>
          </View>
        </Pressable>
        <View style={styles.comingSoonPill}>
          <Text style={styles.comingSoonText}>{t('auth.comingSoon')}</Text>
        </View>
      </View>

      {/* Apple — iOS only (App Store mandatory when Google offered) */}
      {Platform.OS === 'ios' && (
        <View style={styles.stubButtonWrapper}>
          <Pressable style={styles.stubButton} disabled accessibilityLabel={t('auth.continueWithAppleA11y')}>
            <View style={[styles.stubButtonInner, { flexDirection: rtlRow }]}>
              <Text style={styles.stubIcon}></Text>
              <Text style={styles.stubButtonText}>{t('auth.continueWithApple')}</Text>
            </View>
          </Pressable>
          <View style={styles.comingSoonPill}>
            <Text style={styles.comingSoonText}>{t('auth.comingSoon')}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stubGroup: {
    gap: 10,
  },
  stubButtonWrapper: {
    position: 'relative',
  },
  stubButton: {
    height: 48,
    borderRadius: radius['2xl'],
    backgroundColor: SLATE_50,
    borderWidth: 1,
    borderColor: SLATE_200,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  stubButtonInner: {
    alignItems: 'center',
    gap: spacing[2],
  },
  stubIcon: {
    fontSize: 14,
    color: SLATE_400,
    fontFamily: fontFamily.semiBold,
  },
  stubButtonText: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: SLATE_400,
  },
  comingSoonPill: {
    position: 'absolute',
    end: 12,
    top: '50%' as unknown as number,
    transform: [{ translateY: -10 }],
    backgroundColor: SLATE_200,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontSize: 9,
    fontFamily: fontFamily.bold,
    color: SLATE_500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
