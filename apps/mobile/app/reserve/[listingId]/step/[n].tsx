/**
 * Reservation wizard step — /reserve/:listingId/step/:n
 *
 * TODO (W2): Implement individual wizard steps (n = 1, 2, 3).
 */

import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize, spacing } from '../../../../src/theme/theme';

export default function ReserveStepScreen() {
  const { listingId, n } = useLocalSearchParams<{ listingId: string; n: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>TODO: reserve/[listingId]/step/[n] — W2</Text>
        <Text style={styles.param}>listingId: {listingId} · step: {n}</Text>
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
  param: {
    marginTop: spacing[2],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
