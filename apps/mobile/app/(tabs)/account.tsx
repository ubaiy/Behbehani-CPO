/**
 * Account tab — W2 full implementation.
 *
 * Mirrors mockup: mockups/mobile/sprint-M2/06-account.html
 * IA: 4-group hub (Profile & Settings / Buying / Owning / Engagement)
 *     + hero card + status banner + pending-actions strip + danger zone.
 *
 * Coming-Soon pill: option (c) per MOBILE_API_CONTRACT.md v0.5 §2.
 * Palette: white + Royal Blue (brand 50-900) + slate. Red for danger zone only.
 * Font: Plus Jakarta Sans. RTL-aware via I18nManager.isRTL.
 *
 * TODO (W3): Wire sign-out to AuthService.signOut(), wire pending-actions to
 *   /me/inspections.latestOffer, implement language toggle state with i18next.
 */

import { useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { PublicUser, CustomerStatus } from '@behbehani-cpo/shared-types';
import { brand } from '../../src/theme/colors';
import {
  AccountHeader,
  HeroCard,
  StatusBanner,
  PendingActionsStrip,
  TileGroup,
  TileIconGlyph,
  AccountTile,
  CountPill,
  ComingSoonPill,
  DangerZone,
} from '../../src/components/account';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatMonthYear(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return '';
  }
}

// ─── Mock data (W3 replaces with authClient.getMe()) ─────────────────────────

const MOCK_USER: PublicUser = {
  id: 'mock-id',
  email: 'abbas@example.com',
  mobile: '+965 5XXX XXXX',
  fullName: 'Abbas Behbehani',
  role: 'customer',
  adminRoles: [],
  locale: 'en',
  avatarUrl: null,
  status: 'active' as CustomerStatus,
  emailVerifiedAt: null,
  mobileVerifiedAt: null,
  hasPassword: true,
  createdAt: '2026-05-01T00:00:00.000Z',
  lastSignInAt: '2026-05-20T08:00:00.000Z',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AccountScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [lang, setLang] = useState<'en' | 'ar'>('en');

  const { data: user, refetch } = useQuery<PublicUser>({
    queryKey: ['me'],
    queryFn: async () => MOCK_USER,
    staleTime: 60_000,
  });

  const me = user ?? MOCK_USER;
  const nav = (route: string) => router.push(route as Parameters<typeof router.push>[0]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleLangToggle = (l: 'en' | 'ar') => {
    setLang(l);
    // TODO (W3): i18n.changeLanguage(l);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
      <AccountHeader
        title={t('nav.account', 'Account')}
        lang={lang}
        onLangToggle={handleLangToggle}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: '#F8FAFC' }}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand[700]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <HeroCard
          fullName={me.fullName}
          email={me.email}
          mobile={me.mobile}
          avatarUrl={me.avatarUrl}
          initials={getInitials(me.fullName)}
          memberSince={formatMonthYear(me.createdAt)}
          lastSignIn={formatRelative(me.lastSignInAt)}
          onSignOut={() => console.log('TODO (W3): AuthService.signOut()')}
        />

        <StatusBanner
          status={me.status}
          onVerify={() => router.push('/auth/sign-in')}
        />

        <PendingActionsStrip />

        {/* GROUP 1 — PROFILE & SETTINGS */}
        <TileGroup label="Profile & Settings">
          <AccountTile
            icon={<TileIconGlyph glyph="👤" />}
            title="Profile"
            subtitle="Name, email, mobile"
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="📍" />}
            title="Addresses"
            subtitle="Manage saved addresses"
            pill={<CountPill label="2 saved" />}
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="🔔" />}
            title="Notifications"
            subtitle="Push, email & SMS"
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="🛡" />}
            title="Security"
            subtitle="Sessions, sign-out all devices"
            onPress={() => nav('/auth/sign-in')}
          />
        </TileGroup>

        {/* GROUP 2 — BUYING */}
        <TileGroup label="Buying">
          <AccountTile
            icon={<TileIconGlyph glyph="♡" />}
            title="Favourites"
            subtitle="Cars you're watching"
            pill={<CountPill label="8 saved" />}
            onPress={() => nav('/(tabs)/browse')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="🔍" />}
            title="Saved searches"
            subtitle="Alerts when matches arrive"
            pill={<ComingSoonPill />}
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="📋" />}
            title="Inspections"
            subtitle="Your Concierge bookings · 1 active"
            onPress={() => nav('/inspections/test-inspection-id')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="🧾" />}
            title="Purchase history"
            subtitle="Past purchases & receipts"
            pill={<ComingSoonPill />}
            onPress={() => nav('/auth/sign-in')}
          />
        </TileGroup>

        {/* GROUP 3 — OWNING */}
        <TileGroup label="Owning">
          <AccountTile
            icon={<TileIconGlyph glyph="📄" />}
            title="Documents"
            subtitle="Contracts, reports, insurance"
            pill={<ComingSoonPill />}
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="⚙️" />}
            title="Maintenance"
            subtitle="Pickup service & history"
            pill={<ComingSoonPill />}
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="💳" />}
            title="Financing"
            subtitle="Loan status & payments"
            pill={<ComingSoonPill label="COMING Q4 2026" />}
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="↩" />}
            title="Returns"
            subtitle="3-day / 300 km return window"
            pill={<ComingSoonPill label="COMING Q4 2026" />}
            onPress={() => nav('/auth/sign-in')}
          />
        </TileGroup>

        {/* GROUP 4 — ENGAGEMENT */}
        <TileGroup label="Engagement">
          <AccountTile
            icon={<TileIconGlyph glyph="★" />}
            title="Reviews"
            subtitle="Rate cars & services"
            pill={<ComingSoonPill label="COMING Q4 2026" />}
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="🎁" />}
            title="Referrals"
            subtitle="Refer a friend, earn rewards"
            pill={<ComingSoonPill label="COMING 2027" />}
            onPress={() => nav('/auth/sign-in')}
          />
        </TileGroup>

        <DangerZone
          onSignOut={() => console.log('TODO (W3): AuthService.signOut()')}
          onSignOutAll={() => console.log('TODO (W3): AuthService.signOutAll()')}
          onDeleteAccount={() => console.log('TODO (W3): show delete-account confirmation modal')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
