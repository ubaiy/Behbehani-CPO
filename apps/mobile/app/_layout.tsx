/**
 * Root layout — loads fonts, initialises i18n, wires react-query, then renders
 * the Expo Router stack.
 *
 * Order of operations:
 *  1. useFonts loads Plus Jakarta Sans weights from @expo-google-fonts.
 *  2. initI18n reads the persisted locale from SecureStore and configures i18next.
 *  3. SplashScreen is hidden once both are ready.
 *  4. QueryClient + PersistQueryClientProvider wraps the Stack for offline-first
 *     caching via AsyncStorage (W2 decision C3).
 *  5. I18nextProvider ensures the i18n instance is explicitly provided (not just
 *     relying on the singleton) for testability and SSR safety.
 *  6. Stack renders children (tabs, modals, etc.)
 *
 * Cache-key conventions for react-query:
 *   ['listings', 'featured']         — home hero rail (staleTime: 5 min)
 *   ['listings', 'list', filter]     — browse/search results
 *   ['listings', 'detail', slug]     — VDP (staleTime: 10 min)
 *   See ARCHITECTURE.md §3 for the full cache-key registry.
 */

import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
// v1.4 Day 1: push token helpers — imported but wired conditionally below.
import {
  ensurePushPermission,
  captureAndRegisterPushToken,
} from '../src/notifications/pushTokens';
// Task #64: notification tap → deep-link routing.
import {
  setupNotificationRouter,
  extractDeepLink,
  routeToDeepLink,
} from '../src/notifications/notificationRouter';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '../src/i18n/i18n';
import i18nInstance from '../src/i18n/i18n';
import { colors } from '../src/theme/theme';
import { queryClient, asyncStoragePersister } from '../src/services/queryClient';

// Keep the splash screen visible until we're fully ready.
SplashScreen.preventAutoHideAsync();

// ─── React Query setup ────────────────────────────────────────────────────────
// `queryClient` + `asyncStoragePersister` are the SHARED singleton imported from
// `src/services/queryClient.ts`. The same instance is used by `src/services/http.ts`
// so the TOKEN_REUSED forced-sign-out path actually evicts the cache the UI reads.
// See ARCHITECTURE.md §3 for the cache-key registry.

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  // Log font errors — system fallback will be used, but we want visibility.
  useEffect(() => {
    if (fontError) {
      console.warn(
        '[RootLayout] Failed to load Plus Jakarta Sans fonts. System fallback will be used.',
        fontError,
      );
    }
  }, [fontError]);

  useEffect(() => {
    initI18n()
      .then(() => setI18nReady(true))
      .catch((err) => {
        // i18n failure is non-fatal — English fallback is always available.
        console.warn('[RootLayout] i18n init failed, falling back to English.', err);
        setI18nReady(true);
      });
  }, []);

  // Task #64: wire push notification tap listener (foreground + background taps).
  // setupNotificationRouter returns an unsubscribe fn — returned for cleanup.
  useEffect(() => {
    const unsubscribe = setupNotificationRouter();
    return unsubscribe;
  }, []);

  // Task #64: cold-start handler — if the app was launched by tapping a notification
  // while it was not running, getLastNotificationResponseAsync will return that
  // response. We check once on mount and route to the deepLink if present.
  // Guard: do nothing if there is no last response (normal first launch).
  useEffect(() => {
    // Import is re-used from the guarded module; if expo-notifications is absent
    // the module's internal guard already no-ops, so this is safe to call
    // unconditionally via the notificationRouter helpers.
    let cancelled = false;

    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
        const Notifications = require('expo-notifications') as {
          getLastNotificationResponseAsync(): Promise<
            { notification: { request: { content: { data: Record<string, unknown> } } } } | null | undefined
          >;
        };
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (cancelled || !lastResponse) return;

        const url = extractDeepLink(lastResponse as Parameters<typeof extractDeepLink>[0]);
        if (url) {
          await routeToDeepLink(url);
        }
      } catch {
        // expo-notifications not installed or getLastNotificationResponseAsync unavailable.
        // Non-fatal: cold-start routing is best-effort.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, i18nReady]);

  if (!fontsLoaded && !fontError) return null;
  if (!i18nReady) return null;

  // TODO v1.4 Day 2: wire to auth state change observer once an auth state
  // listener (e.g. from AuthService or a React context) is available in layout.
  // The effect below is ready-to-use — uncomment and replace the `false` guard
  // with the real `isSignedIn` boolean from the auth observer.
  //
  // useEffect(() => {
  //   const isSignedIn = false; // replace with real auth state
  //   if (!isSignedIn) return;
  //   void (async () => {
  //     const granted = await ensurePushPermission();
  //     if (granted) {
  //       await captureAndRegisterPushToken();
  //     }
  //   })();
  // }, [/* isSignedIn */]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <I18nextProvider i18n={i18nInstance}>
        <StatusBar style="light" backgroundColor={colors.primary} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: colors.textOnPrimary,
            headerTitleStyle: {
              fontFamily: 'PlusJakartaSans_600SemiBold',
              fontSize: 17,
            },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="listing/[id]" options={{ title: '' }} />
          <Stack.Screen name="listings/[slug]" options={{ headerShown: false }} />
          <Stack.Screen name="offers/[token]/view" options={{ headerShown: false }} />
          <Stack.Screen name="offers/[token]/counter" options={{ headerShown: false }} />
          <Stack.Screen name="offers/[token]/accepted" options={{ headerShown: false }} />
          <Stack.Screen name="offers/[token]/declined" options={{ headerShown: false }} />
          <Stack.Screen name="offers/[token]/expired" options={{ headerShown: false }} />
          <Stack.Screen name="inspections/[id]" options={{ headerShown: false }} />
          {/* Task G1 — customer reserve flow (mirrors web v1.4.11 checkout-modal). */}
          <Stack.Screen
            name="reserve/[listingId]"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          {/* Task #65 — customer orders (list / detail / Otto payment-return). */}
          <Stack.Screen name="orders/index" options={{ headerShown: false }} />
          <Stack.Screen name="orders/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="orders/[id]/payment-return"
            options={{ headerShown: false, gestureEnabled: false }}
          />
          <Stack.Screen
            name="inspection-sign/[token]"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen name="auth/sign-in" options={{ title: 'Sign In' }} />
          <Stack.Screen name="auth/sign-up" options={{ title: 'Create Account' }} />
          <Stack.Screen name="auth/otp" options={{ title: 'Verify' }} />
          <Stack.Screen name="search" options={{ presentation: 'modal', title: 'Search' }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </I18nextProvider>
    </PersistQueryClientProvider>
  );
}
