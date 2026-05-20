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
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '../src/i18n/i18n';
import i18nInstance from '../src/i18n/i18n';
import { colors } from '../src/theme/theme';

// Keep the splash screen visible until we're fully ready.
SplashScreen.preventAutoHideAsync();

// ─── React Query setup ────────────────────────────────────────────────────────
// QueryClient is created outside the component so it is stable across hot-reloads.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale data is refetched on window focus (app foreground) by default.
      staleTime: 5 * 60 * 1000,  // 5 min default; overridden per-query where needed
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
  },
});

// AsyncStorage persister — persists the query cache across app restarts.
// Provides offline-first reading (FR-MOB-005) for stale data during no-network sessions.
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'cpo.query-cache',
});

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
