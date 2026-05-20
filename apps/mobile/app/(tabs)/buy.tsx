/**
 * Buy tab — W1 placeholder.
 * Full browse/filter/search experience ships in W2.
 */

import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, fontFamily, fontSize, spacing } from '../../src/theme/theme';

export default function BuyScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('nav.buy')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing[4],
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: colors.textSecondary,
  },
});
