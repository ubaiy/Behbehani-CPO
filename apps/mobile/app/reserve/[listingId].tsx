/**
 * Reservation wizard root — /reserve/:listingId
 *
 * Hidden route (not in tab bar). Modal stack root.
 * Steps are nested at /reserve/:listingId/step/:n.
 *
 * TODO (W2): Implement reservation wizard with:
 *   - Step 1: Review listing + hold fee
 *   - Step 2: Customer details confirmation
 *   - Step 3: Payment (Stripe/MyFatoorah — TBD)
 *   - Calls POST /v1/public/reservations (MOBILE_API_CONTRACT.md §1.7)
 */

import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize, spacing } from '../../src/theme/theme';

export default function ReserveWizardScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>TODO: reserve/[listingId] — W2</Text>
        <Text style={styles.param}>listingId: {listingId}</Text>
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
