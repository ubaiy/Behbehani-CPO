/**
 * 404 catch-all — displayed when no route matches.
 * Expo Router requires this file to be named +not-found.tsx.
 */

import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fontFamily, fontSize, spacing, radius } from '../src/theme/theme';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>404</Text>
        <Text style={styles.subtitle}>{t('common.pageNotFound', { defaultValue: 'Page not found' })}</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('common.goHome', { defaultValue: 'Go home' })}</Text>
        </Link>
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
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 64,
    color: colors.primary,
  },
  subtitle: {
    marginTop: spacing[3],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  link: {
    marginTop: spacing[6],
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
  },
  linkText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: '#ffffff',
  },
});
