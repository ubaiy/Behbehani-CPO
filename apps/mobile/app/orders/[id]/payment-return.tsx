/**
 * Payment-return landing — /orders/:id/payment-return
 *
 * Otto hosted-checkout redirects here after the user completes payment
 * (deep-link scheme behbehani-motors://orders/:id/payment-return per app.json
 * + v0.13 fix).
 *
 * The screen is intentionally trivial: it immediately router.replace()s into
 * the detail screen, where the staged polling already picks up the new status.
 * We render a brief loading message to cover the swap so the user doesn't see
 * a blank flash on slow devices.
 *
 * NOTE: `router.replace` (not push) so the browser-redirect entry is not in the
 * back stack — back from the detail screen should land on /orders, not bounce
 * the user back into Safari.
 */

import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../../src/theme/colors';

export default function PaymentReturnScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    if (typeof id !== 'string' || id.length === 0) {
      router.replace('/orders' as Parameters<typeof router.replace>[0]);
      return;
    }
    // Fire on next tick so the splash flash is brief but not flickery.
    const handle = setTimeout(() => {
      router.replace(`/orders/${id}` as Parameters<typeof router.replace>[0]);
    }, 50);
    return () => clearTimeout(handle);
  }, [id]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <ActivityIndicator color={brand[700]} size="large" />
        <Text style={styles.title}>{t('orders.paymentReturn.verifying')}</Text>
        <Text style={styles.subtitle}>{t('orders.paymentReturn.paid')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: slate[900],
    marginTop: 12,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: slate[600],
    textAlign: 'center',
    lineHeight: 20,
  },
});
