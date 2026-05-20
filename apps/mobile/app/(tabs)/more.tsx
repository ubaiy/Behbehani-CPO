/**
 * More tab screen — /more
 *
 * W2 locked decision (user decision C2): 8 tabs is too many for a bottom bar
 * on phones < 380px. Visible tabs = Home / Browse / Sell / Services / Account.
 * Finance + Maintenance + Favorites are surfaced via this "More" sheet.
 *
 * This screen is the 6th visible tab (the "More" entry in the tab bar).
 * It presents a simple list of the overflow routes so deep links still work.
 *
 * TODO (W2): Replace the list with a proper bottom sheet (e.g. @gorhom/bottom-sheet).
 *   The current implementation uses a plain ScrollView for W1 correctness.
 */

import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { colors, fontFamily, fontSize, spacing, radius } from '../../src/theme/theme';

interface MoreItem {
  labelKey: string;
  route: '/finance' | '/maintenance' | '/favorites';
}

const MORE_ITEMS: MoreItem[] = [
  { labelKey: 'nav.finance',      route: '/finance' },
  { labelKey: 'nav.maintenance',  route: '/maintenance' },
  { labelKey: 'nav.favorites',    route: '/favorites' },
];

export default function MoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.inner}>
        <Text style={styles.title}>{t('nav.more', { defaultValue: 'More' })}</Text>

        {MORE_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.row}
            onPress={() => router.push(item.route)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>{t(item.labelKey)}</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: {
    flex: 1,
    padding: spacing[4],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    marginBottom: spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing[3],
  },
  rowLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  rowChevron: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xl,
    color: colors.textMuted,
  },
});
