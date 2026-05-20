/**
 * Tab navigator layout — 5 visible tabs + "More" overflow.
 *
 * W2-locked decision (user decision C2): 8 tabs is too many for a bottom bar
 * on phones < 380px. The locked tab bar shows:
 *   1. Home        (index.tsx)
 *   2. Browse      (browse.tsx)   — was "Buy" in earlier stub
 *   3. Sell        (sell.tsx)
 *   4. Services    (services.tsx)
 *   5. Account     (account.tsx)
 *   6. More        (more.tsx)     — sheet listing Finance/Maintenance/Favorites
 *
 * Finance, Maintenance, and Favorites route files exist for deep-link correctness
 * but are hidden from the tab bar (href: null). They are accessible via more.tsx.
 *
 * The earlier buy.tsx stub is also hidden (href: null) — replaced by browse.tsx.
 */

import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fontFamily } from '../../src/theme/theme';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.medium,
          fontSize: 11,
        },
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textOnPrimary,
        headerTitleStyle: {
          fontFamily: fontFamily.semiBold,
          fontSize: 17,
        },
      }}
    >
      {/* ── Visible tabs (5) ─────────────────────────────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{ title: t('nav.home') }}
      />
      <Tabs.Screen
        name="browse"
        options={{ title: t('nav.buy') }}
      />
      <Tabs.Screen
        name="sell"
        options={{ title: t('nav.sell') }}
      />
      <Tabs.Screen
        name="services"
        options={{ title: t('nav.services') }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: t('nav.account') }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: t('nav.more', { defaultValue: 'More' }) }}
      />

      {/* ── Hidden from tab bar — accessible via more.tsx or deep links ── */}
      <Tabs.Screen
        name="finance"
        options={{ href: null, title: t('nav.finance') }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{ href: null, title: t('nav.maintenance') }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ href: null, title: t('nav.favorites') }}
      />
      {/* buy.tsx — legacy stub, hidden in favour of browse.tsx */}
      <Tabs.Screen
        name="buy"
        options={{ href: null, title: t('nav.buy') }}
      />
    </Tabs>
  );
}
