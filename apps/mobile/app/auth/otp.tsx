/**
 * OTP verification screen — /auth/otp
 *
 * Renders "Coming soon" until the API OTP stubs are resolved.
 *
 * Current API state (ARCHITECTURE.md §5):
 *   POST /v1/auth/otp/request → 202 stub (no-op)
 *   POST /v1/auth/otp/verify  → 501
 *
 * TODO (W2): Wire to:
 *   POST /v1/auth/otp/issue  (MOBILE_API_CONTRACT.md §2.1)
 *   POST /v1/auth/otp/verify (MOBILE_API_CONTRACT.md §2.2)
 *   Display OTP input with 6 cells + countdown timer.
 *   Handle discriminated error codes: OTP_INCORRECT, OTP_EXPIRED, OTP_LOCKED, etc.
 */

import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fontFamily, fontSize, spacing } from '../../src/theme/theme';

export default function OtpScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>TODO: auth/otp — W2</Text>
        <Text style={styles.sub}>{t('auth.comingSoon')}</Text>
        <Text style={styles.note}>OTP API endpoints are 501 stubs — blocked on Session B.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  sub: {
    marginTop: spacing[2],
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.primary,
    textAlign: 'center',
  },
  note: {
    marginTop: spacing[3],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
