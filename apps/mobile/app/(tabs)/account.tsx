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
        <TileGroup label={t('account.group.profileSettings')}>
          <AccountTile
            icon={<TileIconGlyph glyph="👤" />}
            title={t('account.tile.profile')}
            subtitle={t('account.tile.profileSub')}
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="📍" />}
            title={t('account.tile.addresses')}
            subtitle={t('account.tile.addressesSub')}
            pill={<CountPill label={t('account.tile.addressesCount', { count: 2 })} />}
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="🔔" />}
            title={t('account.tile.notifications')}
            subtitle={t('account.tile.notificationsSub')}
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="🛡" />}
            title={t('account.tile.security')}
            subtitle={t('account.tile.securitySub')}
            onPress={() => nav('/auth/sign-in')}
          />
        </TileGroup>

        {/* GROUP 2 — BUYING */}
        <TileGroup label={t('account.group.buying')}>
          <AccountTile
            icon={<TileIconGlyph glyph="♡" />}
            title={t('account.tile.favourites')}
            subtitle={t('account.tile.favouritesSub')}
            pill={<CountPill label={t('account.tile.favouritesCount', { count: 8 })} />}
            onPress={() => nav('/(tabs)/browse')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="🔍" />}
            title={t('account.tile.savedSearches')}
            subtitle={t('account.tile.savedSearchesSub')}
            pill={<ComingSoonPill />}
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="📋" />}
            title={t('account.tile.inspections')}
            subtitle={t('account.tile.inspectionsSub')}
            onPress={() => nav('/inspections/test-inspection-id')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="🧾" />}
            title={t('account.tile.orders')}
            subtitle={t('account.tile.ordersSub')}
            onPress={() => nav('/orders')}
          />
        </TileGroup>

        {/* GROUP 3 — OWNING */}
        <TileGroup label={t('account.group.owning')}>
          <AccountTile
            icon={<TileIconGlyph glyph="📄" />}
            title={t('account.tile.documents')}
            subtitle={t('account.tile.documentsSub')}
            pill={<ComingSoonPill />}
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="⚙️" />}
            title={t('account.tile.maintenance')}
            subtitle={t('account.tile.maintenanceSub')}
            pill={<ComingSoonPill />}
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="💳" />}
            title={t('account.tile.financing')}
            subtitle={t('account.tile.financingSub')}
            pill={<ComingSoonPill label={t('account.comingSoon.q4Label')} />}
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="↩" />}
            title={t('account.tile.returns')}
            subtitle={t('account.tile.returnsSub')}
            pill={<ComingSoonPill label={t('account.comingSoon.q4Label')} />}
            onPress={() => nav('/auth/sign-in')}
          />
        </TileGroup>

        {/* GROUP 4 — ENGAGEMENT */}
        <TileGroup label={t('account.group.engagement')}>
          <AccountTile
            icon={<TileIconGlyph glyph="★" />}
            title={t('account.tile.reviews')}
            subtitle={t('account.tile.reviewsSub')}
            pill={<ComingSoonPill label={t('account.comingSoon.q4Label')} />}
            onPress={() => nav('/auth/sign-in')}
          />
          <AccountTile
            icon={<TileIconGlyph glyph="🎁" />}
            title={t('account.tile.referrals')}
            subtitle={t('account.tile.referralsSub')}
            pill={<ComingSoonPill label={t('account.comingSoon.y2027Label')} />}
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
