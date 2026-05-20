/**
 * Services tab — /services
 * TODO (W2): Service booking flows (maintenance scheduling, Concierge inspection booking).
 */

import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fontFamily, fontSize, spacing } from '../../src/theme/theme';

export default function ServicesScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.inner}>
        <Text style={styles.label}>{t('nav.services')}</Text>
        <Text style={styles.sub}>TODO: services — W2</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: colors.textSecondary,
  },
  sub: {
    marginTop: spacing[2],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
