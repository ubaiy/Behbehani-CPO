/**
 * Offer expired — terminal screen.
 * Route: /offers/[token]/expired
 *
 * v0.18.a: wired to real `GET /v1/public/concierge/offers/:token` for the
 * expiry timestamp. If the server returns 410 TOKEN_EXPIRED (no body), we
 * fall back to the static copy — error state never blocks this screen.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { PublicOfferView } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../../src/theme/colors';
import { offersPublicApiClient } from '../../../src/services/http';

const WHATSAPP_URL = 'whatsapp://send?phone=96522473006&text=Hi%20Behbehani';

export default function OfferExpiredScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { t } = useTranslation();

  // The expired terminal page may be loaded after the customer's token has
  // already been invalidated server-side — so we tolerate fetch failures and
  // simply omit the expiry timestamp instead of blocking the screen.
  const { data: offer } = useQuery<PublicOfferView, Error>({
    queryKey: ['offer', token],
    queryFn: () => offersPublicApiClient.getByToken(token as string),
    enabled: typeof token === 'string' && token.length > 0,
    retry: false,
  });

  const expiredOn = offer ? formatExpiry(offer.validUntil) : null;

  const openWhatsApp = () => {
    Linking.openURL(WHATSAPP_URL).catch(() => {
      Linking.openURL('https://wa.me/96522473006?text=Hi%20Behbehani');
    });
  };

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero: slate clock icon + headline ────────────────────────── */}
      <View style={s.hero}>
        <View style={s.iconCircle}>
          <Text style={s.clockIcon}>⏱</Text>
        </View>
        <Text style={s.heroTitle}>{t('offers.expired.heroTitle')}</Text>
        <Text style={s.heroSub}>
          {t('offers.expired.heroSub')}
          {expiredOn ? <> <Text style={s.expiredOn}>{expiredOn}</Text></> : null}
        </Text>
      </View>

      {/* ── Explanation card ──────────────────────────────────────────── */}
      <View style={s.card}>
        <Text style={s.cardText}>
          {t('offers.expired.cardText')}
        </Text>
      </View>

      {/* ── 2 CTAs ───────────────────────────────────────────────────── */}
      <View style={s.ctaGroup}>
        {/* Request new inspection — brand-700 primary */}
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => router.push('/(tabs)/sell' as never)}
          accessibilityLabel={t('offers.expired.newInspectionA11y')}
        >
          <Text style={s.primaryBtnText}>{t('offers.expired.newInspectionBtn')}</Text>
        </TouchableOpacity>

        {/* Contact Customer Service — white + brand border */}
        <TouchableOpacity
          style={s.outlineBtn}
          onPress={openWhatsApp}
          accessibilityLabel={t('offers.expired.contactA11y')}
        >
          <Text style={s.outlineBtnText}>{t('offers.expired.contactBtn')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Back to account ───────────────────────────────────────────── */}
      <View style={s.footer}>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/account' as never)}
          accessibilityLabel={t('offers.expired.backToAccountA11y')}
        >
          <Text style={s.footerLink}>{t('offers.expired.backToAccount')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatExpiry(iso: string): string {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-KW', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const time = d.toLocaleTimeString('en-KW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${date} · ${time}`;
  } catch {
    return '—';
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  content: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20, paddingBottom: 40,
  },

  // Hero
  hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  iconCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: slate[100], borderWidth: 2, borderColor: slate[200],
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  clockIcon: { fontSize: 28, color: slate[500] },
  heroTitle: {
    color: slate[800], fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center',
  },
  heroSub: {
    color: slate[500], fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 22,
  },
  expiredOn: { color: slate[700], fontFamily: 'PlusJakartaSans_600SemiBold' },

  // Card
  card: {
    marginTop: 20, borderRadius: 16,
    borderWidth: 1, borderColor: slate[200], backgroundColor: '#fff', padding: 20,
  },
  cardText: { color: slate[600], fontSize: 13, lineHeight: 20 },

  // CTAs
  ctaGroup: { marginTop: 20, gap: 12 },
  primaryBtn: {
    height: 48, borderRadius: 12,
    backgroundColor: brand[700],
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  outlineBtn: {
    height: 48, borderRadius: 12,
    borderWidth: 2, borderColor: brand[700], backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  outlineBtnText: { color: brand[700], fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' },

  // Footer
  footer: { marginTop: 24, alignItems: 'center' },
  footerLink: { color: slate[500], fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' },
});
