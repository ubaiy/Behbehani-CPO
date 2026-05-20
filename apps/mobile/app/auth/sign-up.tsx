/**
 * Sign-up / Registration screen — /auth/sign-up
 *
 * TODO (W2): Implement registration form wired to:
 *   POST /v1/auth/register (LIVE — returns AuthSession)
 *   Schema: RegisterWithEmailSchema from @behbehani-cpo/shared-types
 */

import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fontFamily, fontSize, spacing } from '../../src/theme/theme';

export default function SignUpScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>TODO: auth/sign-up — W2</Text>
        <Text style={styles.sub}>{t('auth.createAccount')}</Text>
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
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
