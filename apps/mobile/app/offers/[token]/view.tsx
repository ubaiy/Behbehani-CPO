/**
 * Offer view — pre-decision screen.
 * Route: /offers/[token]/view
 *
 * Displays offer amount, vehicle context, inspection report link,
 * and 3 sticky-bottom CTAs: Decline / Counter / Accept.
 *
 * D1 compliance: NO "one counter", "1 round", "only counter" copy anywhere.
 *
 * v0.18.a: wired to real `GET /v1/public/concierge/offers/:token` via
 * `offersPublicApiClient.getByToken`. The inspection-card CTA now navigates
 * with `offer.inspectionReportId` (closes the v0.16 mock test-id carry-over).
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { PublicOfferView } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../../src/theme/colors';
import { offersPublicApiClient } from '../../../src/services/http';
import { formatKwd } from '../../../src/components/orders/orders.utils';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OfferViewScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { t } = useTranslation();

  const { data: offer, isLoading, isError } = useQuery<PublicOfferView, Error>({
    queryKey: ['offer', token],
    queryFn: () => offersPublicApiClient.getByToken(token as string),
    enabled: typeof token === 'string' && token.length > 0,
  });

  // ─── Loading / error branches ─────────────────────────────────────────────

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

  // ─── Derived display values ───────────────────────────────────────────────

  const offerKwd = offer.offerAmountKwd || formatKwd(offer.offerAmountFils);
  const badgeText = `CONCIERGE OFFER · ${offer.bookingRef}`;
  const validUntilFormatted = formatValidUntil(offer.validUntil);
  const vehicleTitle = offer.vehicleLabel || '—';
  const hasInspection =
    typeof offer.inspectionReportId === 'string' && offer.inspectionReportId.length > 0;

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero section ─────────────────────────────────────────────── */}
        <View style={s.hero}>
          {/* Back button */}
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
            accessibilityLabel={t('offers.view.backA11y')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.backChevron}>‹</Text>
          </TouchableOpacity>

          {/* Badge */}
          <View style={s.badge}>
            <View style={s.badgeDot} />
            <Text style={s.badgeText}>{badgeText}</Text>
          </View>

          <Text style={s.heroTitle}>{t('offers.view.heroTitle')}</Text>
          <Text style={s.heroSub}>
            {t('offers.view.heroSub')}
          </Text>

          {/* Offer amount card */}
          <View style={s.offerCard}>
            <Text style={s.offerLabel}>{t('offers.view.offerLabel')}</Text>
            <Text style={s.offerAmount}>{offerKwd}</Text>
            <View style={s.validRow}>
              <Text style={s.clockIcon}>⏱</Text>
              <Text style={s.validText}>
                {t('offers.view.validUntil')}{' '}
                <Text style={s.validBold}>{validUntilFormatted}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* ── Inspection report link ────────────────────────────────────── */}
        {hasInspection && (
          <View style={s.section}>
            <TouchableOpacity
              style={s.inspectionCard}
              onPress={() =>
                offer.inspectionReportId &&
                router.push(`/inspections/${offer.inspectionReportId}` as never)
              }
              accessibilityLabel={t('offers.view.inspectionA11y')}
            >
              <View style={s.inspectionIcon}>
                <Text style={s.inspectionIconText}>✓</Text>
              </View>
              <View style={s.inspectionBody}>
                <Text style={s.inspectionTitle}>{t('offers.view.inspectionTitle')}</Text>
                <Text style={s.inspectionSub}>{t('offers.view.inspectionSub')}</Text>
              </View>
              <Text style={[s.chevronRight, { transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }]}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Vehicle context ───────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>{t('offers.view.yourCar')}</Text>
          <View style={s.vehicleCard}>
            <Text style={s.vehicleTitle}>{vehicleTitle}</Text>
          </View>
        </View>

        {/* ── Terms note ────────────────────────────────────────────────── */}
        <View style={[s.section, { paddingBottom: 24 }]}>
          <View style={s.termsCard}>
            <Text style={s.termsText}>
              <Text style={s.termsBold}>{t('offers.view.accept')}</Text> {t('offers.view.termsAcceptBody')}{' '}
              <Text style={s.termsBold}>{t('offers.view.decline')}</Text> {t('offers.view.termsDeclineBody')}{' '}
              <Text style={s.termsLink}>{t('offers.view.saleTerms')}</Text>.
            </Text>
          </View>
        </View>

        {/* ── Expiry footnote (D1: NO "one counter" copy) ───────────────── */}
        <View style={s.expiryNote}>
          <Text style={s.expiryText}>{t('offers.view.expiryNote')}</Text>
        </View>
      </ScrollView>

      {/* ── Sticky footer CTAs ────────────────────────────────────────────── */}
      <View style={s.footer}>
        {/* Accept — primary, flex 1.4 */}
        <TouchableOpacity
          style={[s.cta, s.ctaAccept, { flex: 1.4 }]}
          onPress={() => router.push(`/offers/${token}/accepted` as never)}
          accessibilityLabel={t('offers.view.acceptA11y')}
          disabled={!offer.canRespond}
        >
          <Text style={s.ctaAcceptText}>{t('offers.view.acceptBtn')} — {offerKwd}</Text>
        </TouchableOpacity>

        <View style={s.ctaRow}>
          {/* Counter — white + brand border */}
          <TouchableOpacity
            style={[s.cta, s.ctaCounter, { flex: 1 }]}
            onPress={() => router.push(`/offers/${token}/counter` as never)}
            accessibilityLabel={t('offers.view.counterA11y')}
            disabled={!offer.canRespond}
          >
            <Text style={s.ctaCounterText}>{t('offers.view.counterBtn')}</Text>
          </TouchableOpacity>

          {/* Decline — text-only */}
          <TouchableOpacity
            style={[s.cta, s.ctaDecline, { flex: 1 }]}
            onPress={() => router.push(`/offers/${token}/declined` as never)}
            accessibilityLabel={t('offers.view.declineA11y')}
            disabled={!offer.canRespond}
          >
            <Text style={s.ctaDeclineText}>{t('offers.view.declineBtn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** ISO → "Mon, 26 May · 23:59" (Behbehani convention). */
function formatValidUntil(iso: string): string {
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 180 },

  // Loading / error
  centerState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, gap: 8,
  },
  centerMuted: { color: slate[500], fontSize: 14, textAlign: 'center' },
  centerError: { color: slate[900], fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center' },

  // Hero
  hero: {
    backgroundColor: brand[900],
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginStart: -8,
  },
  backChevron: {
    color: '#fff', fontSize: 24,
    transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }],
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4,
    alignSelf: 'flex-start', marginTop: 16,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: brand[300] },
  badgeText: { color: '#fff', fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1.2 },
  heroTitle: { color: '#fff', fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold', marginTop: 12 },
  heroSub: { color: brand[100], fontSize: 13, marginTop: 8, lineHeight: 20 },

  offerCard: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    padding: 20,
  },
  offerLabel: { color: brand[200], fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1.4 },
  offerAmount: { color: '#fff', fontSize: 38, fontFamily: 'PlusJakartaSans_700Bold', marginTop: 4 },
  validRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  clockIcon: { fontSize: 14, color: brand[200] },
  validText: { color: brand[100], fontSize: 12, flex: 1 },
  validBold: { color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold' },
  validMuted: { color: brand[200] },

  // Section wrapper
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionLabel: { color: slate[500], fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1.2, marginBottom: 8 },

  // Inspection card
  inspectionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16, borderWidth: 1, borderColor: slate[200],
    backgroundColor: '#fff', minHeight: 60,
  },
  inspectionIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: brand[50], alignItems: 'center', justifyContent: 'center',
  },
  inspectionIconText: { color: brand[700], fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold' },
  inspectionBody: { flex: 1 },
  inspectionTitle: { color: slate[900], fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  inspectionSub: { color: slate[500], fontSize: 12, marginTop: 2 },
  chevronRight: { color: slate[400], fontSize: 20 },

  // Vehicle card
  vehicleCard: { borderRadius: 16, borderWidth: 1, borderColor: slate[200], backgroundColor: '#fff', padding: 16 },
  vehicleTitle: { color: slate[900], fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },

  // Terms
  termsCard: { backgroundColor: slate[50], borderRadius: 12, borderWidth: 1, borderColor: slate[200], padding: 12 },
  termsText: { color: slate[600], fontSize: 11, lineHeight: 17 },
  termsBold: { color: slate[900], fontFamily: 'PlusJakartaSans_600SemiBold' },
  termsLink: { color: brand[700], fontFamily: 'PlusJakartaSans_600SemiBold' },

  // Expiry footnote — D1: expiry only, no counter-round copy
  expiryNote: { paddingHorizontal: 20, paddingBottom: 8, alignItems: 'center' },
  expiryText: { color: slate[400], fontSize: 11 },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: slate[200],
    paddingHorizontal: 20, paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  cta: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  ctaRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  ctaAccept: { backgroundColor: brand[700] },
  ctaAcceptText: { color: '#fff', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
  ctaCounter: { borderWidth: 2, borderColor: brand[700], backgroundColor: '#fff' },
  ctaCounterText: { color: brand[700], fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' },
  ctaDecline: { backgroundColor: 'transparent' },
  ctaDeclineText: { color: slate[500], fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' },
});
