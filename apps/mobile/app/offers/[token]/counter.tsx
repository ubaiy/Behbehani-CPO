/**
 * Counter offer screen.
 * Route: /offers/[token]/counter
 *
 * D1 compliance: NO "1 round", "once", "only counter", "single counter" copy.
 * Neutral copy only: "BMC will review and respond within 24 hours."
 *
 * v0.18.a: wired to real `GET /v1/public/concierge/offers/:token` (offer
 * summary card) + POST /respond (counter submission) via
 * `offersPublicApiClient`.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { PublicOfferView } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../../src/theme/colors';
import { offersPublicApiClient } from '../../../src/services/http';
import { formatKwd } from '../../../src/components/orders/orders.utils';

export default function CounterScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const { data: offer, isLoading, isError } = useQuery<PublicOfferView, Error>({
    queryKey: ['offer', token],
    queryFn: () => offersPublicApiClient.getByToken(token as string),
    enabled: typeof token === 'string' && token.length > 0,
  });

  const counterMutation = useMutation({
    mutationFn: async (counterAmountFils: number) => {
      return offersPublicApiClient.respond(token as string, 'counter', {
        counterAmountFils,
        counterNotes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      router.push(`/offers/${token}/view` as never);
    },
    onError: () => {
      Alert.alert(
        t('offers.view.error'),
        t('offers.view.retry'),
      );
    },
  });

  const handleSend = () => {
    // Parse KWD with decimals → fils (integer).
    const kwd = parseFloat(amount.replace(/,/g, ''));
    if (!Number.isFinite(kwd) || kwd <= 0) {
      Alert.alert(t('offers.view.error'), t('offers.counter.amountHint'));
      return;
    }
    const fils = Math.round(kwd * 1000);
    counterMutation.mutate(fils);
  };

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

  const offerKwd = offer.offerAmountKwd || formatKwd(offer.offerAmountFils);
  const summaryMeta = `${offer.vehicleLabel || '—'} · ${offer.bookingRef}`;

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.push(`/offers/${token}/view` as never)}
          accessibilityLabel={t('offers.counter.backA11y')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[s.backChevron, { transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }]}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('offers.counter.headerTitle')}</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Original offer summary (brand-50) ──────────────────────── */}
        <View style={s.offerSummary}>
          <Text style={s.offerSummaryLabel}>{t('offers.counter.offerSummaryLabel')}</Text>
          <Text style={s.offerSummaryAmount}>{offerKwd}</Text>
          <Text style={s.offerSummaryMeta}>{summaryMeta}</Text>
        </View>

        {/* ── Counter amount input ────────────────────────────────────── */}
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>{t('offers.counter.askingPriceLabel')}</Text>
          <View style={s.amountRow}>
            <View style={s.kwdChip}>
              <Text style={s.kwdText}>KWD</Text>
            </View>
            <TextInput
              style={s.amountInput}
              inputMode="decimal"
              placeholder="5,000.000"
              placeholderTextColor={slate[400]}
              value={amount}
              onChangeText={setAmount}
              accessibilityLabel={t('offers.counter.amountInputA11y')}
              editable={!counterMutation.isPending}
            />
          </View>
          <Text style={s.fieldHint}>
            {t('offers.counter.amountHint', { amount: offerKwd })}
          </Text>
        </View>

        {/* ── Notes textarea ──────────────────────────────────────────── */}
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>
            {t('offers.counter.notesLabel')}{'  '}
            <Text style={s.fieldLabelOptional}>({t('offers.counter.notesOptional')})</Text>
          </Text>
          <TextInput
            style={s.notesInput}
            multiline
            numberOfLines={4}
            maxLength={500}
            placeholder={t('offers.counter.notesPlaceholder')}
            placeholderTextColor={slate[400]}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
            accessibilityLabel={t('offers.counter.notesA11y')}
            editable={!counterMutation.isPending}
          />
          <Text style={s.charCount}>{notes.length} / 500</Text>
        </View>

        {/* ── D1 neutral info card — no warning chip, no round-limit copy ── */}
        <View style={s.infoCard}>
          <Text style={s.infoIcon}>⏱</Text>
          <Text style={s.infoText}>
            {t('offers.counter.reviewInfo')}{' '}
            <Text style={s.infoBold}>{t('offers.counter.reviewInfoBold')}</Text>.
          </Text>
        </View>
      </ScrollView>

      {/* ── Sticky bottom: Cancel + Send counter ──────────────────────────── */}
      <View style={s.footer}>
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={() => router.push(`/offers/${token}/view` as never)}
          accessibilityLabel={t('offers.counter.cancelA11y')}
          disabled={counterMutation.isPending}
        >
          <Text style={s.cancelText}>{t('offers.counter.cancelBtn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.sendBtn, counterMutation.isPending && { opacity: 0.6 }]}
          onPress={handleSend}
          accessibilityLabel={t('offers.counter.sendA11y')}
          disabled={counterMutation.isPending}
        >
          <Text style={s.sendText}>{t('offers.counter.sendBtn')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  // Loading / error
  centerState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, gap: 8,
  },
  centerMuted: { color: slate[500], fontSize: 14, textAlign: 'center' },
  centerError: { color: slate[900], fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: slate[200],
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginStart: -8,
  },
  backChevron: { color: slate[700], fontSize: 24 },
  headerTitle: { color: slate[900], fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 160, gap: 16 },

  // Offer summary card
  offerSummary: {
    backgroundColor: brand[50], borderRadius: 16,
    borderWidth: 1, borderColor: brand[200], padding: 16,
  },
  offerSummaryLabel: {
    color: brand[700], fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1.4, marginBottom: 4,
  },
  offerSummaryAmount: { color: brand[900], fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold' },
  offerSummaryMeta: { color: brand[700], fontSize: 12, marginTop: 4 },

  // Field group
  fieldGroup: { gap: 6 },
  fieldLabel: { color: slate[700], fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  fieldLabelOptional: { color: slate[400], fontFamily: 'PlusJakartaSans_400Regular' },
  fieldHint: { color: slate[500], fontSize: 11, paddingStart: 4 },

  // Amount input
  amountRow: {
    flexDirection: 'row', height: 48, borderRadius: 12,
    borderWidth: 2, borderColor: slate[300], overflow: 'hidden', backgroundColor: '#fff',
  },
  kwdChip: {
    paddingHorizontal: 12, backgroundColor: slate[50],
    borderEndWidth: 1, borderEndColor: slate[200],
    alignItems: 'center', justifyContent: 'center',
  },
  kwdText: { color: slate[500], fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  amountInput: {
    flex: 1, paddingHorizontal: 12,
    fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: slate[900],
  },

  // Notes
  notesInput: {
    borderRadius: 12, borderWidth: 1, borderColor: slate[300],
    backgroundColor: '#fff', padding: 12, fontSize: 14, color: slate[900],
    minHeight: 100, lineHeight: 22,
  },
  charCount: { color: slate[400], fontSize: 11, textAlign: 'right' },

  // D1 neutral info card — brand-50 background, brand-200 border
  infoCard: {
    backgroundColor: brand[50], borderRadius: 12,
    borderWidth: 1, borderColor: brand[200],
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16,
  },
  infoIcon: { fontSize: 18, color: brand[600], marginTop: 1 },
  infoText: { flex: 1, color: slate[600], fontSize: 13, lineHeight: 20 },
  infoBold: { color: slate[800], fontFamily: 'PlusJakartaSans_600SemiBold' },

  // Footer
  footer: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1, borderTopColor: slate[200], backgroundColor: '#fff',
  },
  cancelBtn: {
    height: 48, paddingHorizontal: 20, borderRadius: 12,
    borderWidth: 1, borderColor: slate[300],
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { color: slate[700], fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' },
  sendBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: brand[700],
    alignItems: 'center', justifyContent: 'center',
  },
  sendText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
});
