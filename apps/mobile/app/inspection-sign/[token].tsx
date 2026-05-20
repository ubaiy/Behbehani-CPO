/**
 * Inspection Sign — deep-link handler  /inspection-sign/:token
 *
 * Per MOBILE_API_CONTRACT.md §4 — apps/web owns the signature screen.
 * Mobile receives the deep-link behbehani-motors://inspection-sign/:token
 * and bounces to the web URL via expo-web-browser.openBrowserAsync().
 *
 * NO-AUTH ROUTE. Token-gated via path param (single-use, time-limited).
 * Do NOT use httpClient here — no Bearer token needed; avoid triggering
 * the 401-refresh interceptor (CONCIERGE_INSPECTION_API_CONTRACT.md §data-flow).
 *
 * After the in-app browser session closes, the user is returned to their
 * previous screen (or the Account tab as fallback).
 *
 * TODO (W3): Replace expo-web-browser require-guard with a proper package.json
 *   dependency once confirmed available in the managed workflow build.
 */

import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { brand, slate } from '../../src/theme/colors';

export default function InspectionSignDeepLink() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // require-guard: expo-web-browser is not yet in package.json.
        // When added, move to a top-level import and remove this guard.
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
        const WebBrowser = require('expo-web-browser') as any;
        const url = `https://www.behbehani-motors.com/inspection-sign/${token ?? ''}`;
        await WebBrowser.openBrowserAsync(url, {
          dismissButtonStyle: 'close',
        });
      } catch (err) {
        console.warn('[inspection-sign deep-link] failed to open browser:', err);
      } finally {
        // Return the user to where they came from once the browser session ends
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/account');
        }
      }
    })();
  }, [token, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={brand[700]} />
      <Text style={styles.label}>{t('inspection.signBouncer.opening')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  label: {
    marginTop: 16,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontWeight: '500',
    fontSize: 14,
    color: slate[500],
  },
});
