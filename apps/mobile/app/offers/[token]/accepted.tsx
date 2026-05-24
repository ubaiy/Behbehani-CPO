/**
 * Offer accepted — terminal success screen.
 * Route: /offers/[token]/accepted
 *
 * v0.18.a: wired to real `GET /v1/public/concierge/offers/:token` so the
 * confirmation card and booking-ref link surface live data instead of mocks.
 * (The terminal state is gated by status, but the page may also be opened
 * directly via a shared link after the customer has already accepted.)
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { PublicOfferView } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../../src/theme/colors';
import { offersPublicApiClient } from '../../../src/services/http';
import { formatKwd } from '../../../src/components/orders/orders.utils';

export default function OfferAcceptedScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { t } = useTranslation();

  const { data: offer, isLoading, isError } = useQuery<PublicOfferView, Error>({
    queryKey: ['offer', token],
    queryFn: () => offersPublicApiClient.getByToken(token as string),
    enabled: typeof token === 'string' && token.length > 0,
  });

  if (isLoading) {
    return (
      <View style={s.root}>
        <View style={s.centerState}>
          <Text style={s.centerMuted}>{t('offers.view.loading')}</Text>
        </View>
      </View>
    );
  }

  if (isError || !offer) {
    return (
      <View style={s.root}>
        <View style={s.centerState}>
          <Text style={s.centerError}>{t('offers.view.error')}</Text>
          <Text style={s.centerMuted}>{t('offers.view.retry')}</Text>
        </View>
      </View>
    );
  }

  const offerAmount = offer.offerAmountKwd || formatKwd(offer.offerAmountFils);
  const bookingRef = offer.bookingRef;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero: checkmark icon + headline ──────────────────────────── */}
      <View style={s.hero}>
        <View style={s.iconCircle}>
          <Text style={s.checkmark}>✓</Text>
        </View>
        <Text style={s.heroTitle}>{t('offers.accepted.heroTitle')}</Text>
        <Text style={s.heroSub}>
          {t('offers.accepted.heroSub')}{' '}
          <Text style={s.heroAmount}>{offerAmount}</Text>
        </Text>
      </View>

      {/* ── Confirmation card ─────────────────────────────────────────── */}
      <View style={s.confirmCard}>
        <Text style={s.confirmText}>
          {t('offers.accepted.confirmText')}
        </Text>
        <Text style={s.confirmSub}>
          {t('offers.accepted.confirmSub')}
        </Text>
      </View>

      {/* ── Next steps ───────────────────────────────────────────────── */}
      <View style={s.stepsCard}>
        <Text style={s.stepsLabel}>{t('offers.accepted.stepsLabel')}</Text>

        <View style={s.step}>
          <View style={[s.stepNumCircle, s.stepNumActive]}>
            <Text style={[s.stepNum, s.stepNumActiveText]}>1</Text>
          </View>
          <View style={s.stepBody}>
            <Text style={s.stepTitle}>{t('offers.accepted.step1Title')}</Text>
            <Text style={s.stepDesc}>
              {t('offers.accepted.step1Desc')}
            </Text>
          </View>
        </View>

        <View style={s.step}>
          <View style={[s.stepNumCircle, s.stepNumIdle]}>
            <Text style={[s.stepNum, s.stepNumIdleText]}>2</Text>
          </View>
          <View style={s.stepBody}>
            <Text style={s.stepTitle}>{t('offers.accepted.step2Title')}</Text>
            <Text style={s.stepDesc}>
              {t('offers.accepted.step2Desc')}
            </Text>
          </View>
        </View>

        <View style={[s.step, { marginBottom: 0 }]}>
          <View style={[s.stepNumCircle, s.stepNumIdle]}>
            <Text style={[s.stepNum, s.stepNumIdleText]}>3</Text>
          </View>
          <View style={s.stepBody}>
            <Text style={s.stepTitle}>{t('offers.accepted.step3Title')}</Text>
            <Text style={s.stepDesc}>
              {offerAmount} {t('offers.accepted.step3Desc')}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Booking reference ─────────────────────────────────────────── */}
      <View style={s.refCard}>
        <TouchableOpacity accessibilityLabel={t('offers.accepted.bookingRefA11y', { ref: bookingRef })}>
          <Text style={s.refLink}>{t('offers.accepted.bookingRefLink')} {bookingRef}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Back to account ───────────────────────────────────────────── */}
      <View style={s.footer}>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/account' as never)}
          accessibilityLabel={t('offers.accepted.backToAccountA11y')}
        >
          <Text style={s.footerLink}>{t('offers.accepted.backToAccount')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  content: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20, paddingBottom: 40,
  },

  // Loading / error
  centerState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, gap: 8,
  },
  centerMuted: { color: slate[500], fontSize: 14, textAlign: 'center' },
  centerError: { color: slate[900], fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center' },

  // Hero
  hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  iconCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: brand[50], borderWidth: 2, borderColor: brand[200],
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  checkmark: { color: brand[700], fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold' },
  heroTitle: {
    color: slate[900], fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center',
  },
  heroSub: { color: slate[600], fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  heroAmount: { color: brand[700], fontFamily: 'PlusJakartaSans_700Bold' },

  // Confirmation card
  confirmCard: {
    marginTop: 20, borderRadius: 16,
    backgroundColor: brand[50], borderWidth: 1, borderColor: brand[200], padding: 20,
  },
  confirmText: { color: brand[900], fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', lineHeight: 20 },
  confirmSub: { color: brand[700], fontSize: 12, marginTop: 8, lineHeight: 18 },

  // Steps card
  stepsCard: {
    marginTop: 20, borderRadius: 16,
    borderWidth: 1, borderColor: slate[200], backgroundColor: '#fff', padding: 20,
  },
  stepsLabel: {
    color: slate[500], fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1.2, marginBottom: 16,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  stepNumCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepNumActive: { backgroundColor: brand[700] },
  stepNumIdle: { backgroundColor: brand[100], borderWidth: 1, borderColor: brand[200] },
  stepNum: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },
  stepNumActiveText: { color: '#fff' },
  stepNumIdleText: { color: brand[700] },
  stepBody: { flex: 1 },
  stepTitle: { color: slate[800], fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' },
  stepDesc: { color: slate[500], fontSize: 12, marginTop: 4, lineHeight: 18 },

  // Booking ref
  refCard: {
    marginTop: 16, borderRadius: 12,
    backgroundColor: slate[50], borderWidth: 1, borderColor: slate[200],
    padding: 16, alignItems: 'center',
  },
  refLink: { color: brand[700], fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', textDecorationLine: 'underline' },

  // Footer
  footer: { marginTop: 24, alignItems: 'center' },
  footerLink: { color: slate[500], fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' },
});
