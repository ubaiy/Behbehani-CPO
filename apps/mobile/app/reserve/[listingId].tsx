/**
 * Reserve flow — /reserve/:listingId   (Task G1, mirrors web v1.4.11 checkout-modal)
 *
 * Internal state machine (mirrors A's checkout-modal):
 *   idle              → payment-method picker
 *   creating          → spinner; calling orders.create
 *   confirmed         → order summary (stock + reservationFee + expiresAt) +
 *                       "Continue to Payment" CTA
 *   initiatingPayment → spinner; calling orders.initPayment
 *   redirecting       → "Opening secure payment…" + WebBrowser.openBrowserAsync;
 *                       on dismiss → router.replace(/orders/:id/payment-return?id=…)
 *   error             → mapped ORDER_ERROR_CODES → i18n key + retry/cancel buttons
 *
 * Active payment methods: knet, card
 * Coming-soon (disabled, toast on tap): apple_pay, google_pay
 *
 * The OrdersPublicApiClient already attaches Idempotency-Key to POST /orders +
 * POST /orders/:id/payment-init internally — no manual key generation here.
 *
 * VDP "Reserve Now" sticky CTA navigates here via router.push(`/reserve/${listing.id}`).
 *
 * Companion files (apps/mobile/src/components/reserve/):
 *   reserve.styles.ts     — all StyleSheet entries (split for the 500-line cap)
 *   reserve.constants.ts  — METHOD_LABELS, ERROR_MAP, ACTIVE_METHODS, COMING_SOON_METHODS
 *   reserve.utils.ts      — formatExpiresAt(), extractErrorCode()
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import type {
  CreateOrderResponseDto,
  PaymentMethodValue,
} from '@behbehani-cpo/shared-types';

import { brand } from '../../src/theme/colors';
import { ordersPublicApiClient } from '../../src/services/http';
import { formatKwd } from '../../src/components/orders/orders.utils';
import { reserveStyles as styles } from '../../src/components/reserve/reserve.styles';
import {
  ACTIVE_METHODS,
  COMING_SOON_METHODS,
  ERROR_MAP,
  METHOD_LABELS,
} from '../../src/components/reserve/reserve.constants';
import {
  extractErrorCode,
  formatExpiresAt,
} from '../../src/components/reserve/reserve.utils';

// ─── State machine ────────────────────────────────────────────────────────────

type ModalState =
  | { kind: 'idle' }
  | { kind: 'creating' }
  | { kind: 'confirmed'; order: CreateOrderResponseDto }
  | { kind: 'initiatingPayment' }
  | { kind: 'redirecting' }
  | { kind: 'error'; code: string };

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ReserveScreen() {
  const { t } = useTranslation();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();

  const [state, setState] = useState<ModalState>({ kind: 'idle' });
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodValue | null>(
    null,
  );
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  // ─── Method picker ─────────────────────────────────────────────────────────

  const handleSelectMethod = useCallback((method: PaymentMethodValue) => {
    setSelectedMethod(method);
    setErrorCode(null);
  }, []);

  const handleComingSoonTap = useCallback(() => {
    Alert.alert(
      t('checkout.modal.comingSoonTitle'),
      t('checkout.modal.comingSoonBody'),
    );
  }, [t]);

  // ─── Create order ──────────────────────────────────────────────────────────

  const handleReserve = useCallback(async () => {
    const method = selectedMethod;
    if (!method || typeof listingId !== 'string' || listingId.length === 0) {
      return;
    }
    setErrorCode(null);
    setState({ kind: 'creating' });
    try {
      const value = await ordersPublicApiClient.create({
        listingId,
        paymentMethod: method,
      });
      setPendingOrderId(value.order.id);
      setState({ kind: 'confirmed', order: value });
    } catch (err) {
      const code = extractErrorCode(err);
      setErrorCode(code);
      setState({ kind: 'error', code });
    }
  }, [listingId, selectedMethod]);

  // ─── Initiate payment + open Otto hosted-checkout ──────────────────────────

  const handleContinueToPayment = useCallback(async () => {
    const orderId = pendingOrderId;
    const method = selectedMethod;
    if (!orderId || !method) return;
    setState({ kind: 'initiatingPayment' });
    setErrorCode(null);
    try {
      const value = await ordersPublicApiClient.initPayment(orderId, { method });
      setState({ kind: 'redirecting' });
      // Open Otto hosted-checkout in the in-app browser tab. The browser closes
      // either via the user dismissing it or via Otto deep-linking back to
      // behbehani-motors://orders/:id/payment-return. Either way, on resolve
      // we land on the payment-return route which immediately replaces into
      // /orders/:id where the staged polling reconciles status.
      try {
        await WebBrowser.openBrowserAsync(value.hostedPaymentUrl, {
          dismissButtonStyle: 'close',
        });
      } catch (browserErr) {
        // Non-fatal — the deep-link path remains, but surface a warning so the
        // user is not left staring at a "Opening…" spinner forever.
        console.warn('[reserve] openBrowserAsync failed:', browserErr);
      }
      router.replace(
        `/orders/${orderId}/payment-return?id=${orderId}` as Parameters<
          typeof router.replace
        >[0],
      );
    } catch (err) {
      const code = extractErrorCode(err);
      setErrorCode(code);
      setState({ kind: 'error', code });
    }
  }, [pendingOrderId, selectedMethod]);

  // ─── Misc ──────────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as Parameters<typeof router.replace>[0]);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setErrorCode(null);
    setState({ kind: 'idle' });
  }, []);

  const handleBrowseSimilar = useCallback(() => {
    router.replace('/(tabs)/browse' as Parameters<typeof router.replace>[0]);
  }, []);

  // Guard against missing listingId param.
  useEffect(() => {
    if (typeof listingId !== 'string' || listingId.length === 0) {
      router.replace('/(tabs)' as Parameters<typeof router.replace>[0]);
    }
  }, [listingId]);

  // ─── Render helpers ────────────────────────────────────────────────────────

  const errorMessageKey = errorCode
    ? ERROR_MAP[errorCode] ?? 'checkout.modal.error.generic'
    : 'checkout.modal.error.generic';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleClose}
          style={styles.closeBtn}
          accessibilityLabel={t('checkout.modal.close')}
          hitSlop={8}
        >
          <Text style={styles.closeBtnGlyph}>×</Text>
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {t('checkout.modal.title')}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {t('checkout.modal.sub')}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {state.kind === 'idle' && (
          <View>
            <Text style={styles.sectionLabel}>
              {t('checkout.modal.chooseMethod')}
            </Text>
            {ACTIVE_METHODS.map((m) => {
              const isSelected = selectedMethod === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => handleSelectMethod(m)}
                  style={[
                    styles.methodBtn,
                    isSelected ? styles.methodBtnSelected : styles.methodBtnIdle,
                  ]}
                  accessibilityLabel={t(METHOD_LABELS[m])}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.methodBtnLabel,
                      isSelected && styles.methodBtnLabelSelected,
                    ]}
                  >
                    {t(METHOD_LABELS[m])}
                  </Text>
                  {isSelected && (
                    <View style={styles.methodCheckDot}>
                      <Text style={styles.methodCheckGlyph}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}

            {COMING_SOON_METHODS.map((m) => (
              <Pressable
                key={m}
                onPress={handleComingSoonTap}
                style={[styles.methodBtn, styles.methodBtnSoon]}
                accessibilityLabel={`${t(METHOD_LABELS[m])} – ${t(
                  'checkout.modal.comingSoon',
                )}`}
              >
                <Text style={styles.methodBtnLabelSoon}>{t(METHOD_LABELS[m])}</Text>
                <View style={styles.soonPill}>
                  <Text style={styles.soonPillText}>
                    {t('checkout.modal.comingSoon')}
                  </Text>
                </View>
              </Pressable>
            ))}

            {errorCode && (
              <View style={styles.inlineError} accessibilityRole="alert">
                <Text style={styles.inlineErrorText}>{t(errorMessageKey)}</Text>
                {errorCode === 'LISTING_ALREADY_RESERVED' && (
                  <Pressable
                    onPress={handleBrowseSimilar}
                    style={styles.browseSimilarBtn}
                  >
                    <Text style={styles.browseSimilarText}>
                      {t('checkout.modal.error.browseSimilar')}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            <Pressable
              onPress={handleReserve}
              disabled={!selectedMethod}
              style={[
                styles.primaryCta,
                !selectedMethod && styles.primaryCtaDisabled,
              ]}
              accessibilityLabel={t('checkout.modal.reserveCta')}
            >
              <Text style={styles.primaryCtaText}>
                {t('checkout.modal.reserveCta')}
              </Text>
            </Pressable>
            <Text style={styles.hint}>{t('checkout.modal.reserveHint')}</Text>
          </View>
        )}

        {(state.kind === 'creating' || state.kind === 'initiatingPayment') && (
          <View style={styles.spinnerBlock}>
            <ActivityIndicator color={brand[700]} size="large" />
            <Text style={styles.spinnerLabel}>
              {state.kind === 'creating'
                ? t('checkout.modal.creating')
                : t('checkout.modal.connectingOtto')}
            </Text>
          </View>
        )}

        {state.kind === 'confirmed' && (
          <View>
            <View style={styles.confirmedCard}>
              <View style={styles.confirmedHeader}>
                <View style={styles.confirmedHeaderDot}>
                  <Text style={styles.confirmedHeaderGlyph}>✓</Text>
                </View>
                <Text style={styles.confirmedHeaderTitle}>
                  {t('checkout.modal.confirmed.title')}
                </Text>
              </View>
              <View style={styles.confirmedRow}>
                <Text style={styles.confirmedRowLabel}>
                  {t('checkout.modal.confirmed.stock')}
                </Text>
                <Text style={styles.confirmedRowValue}>
                  {state.order.order.stockNumber}
                </Text>
              </View>
              <View style={styles.confirmedRow}>
                <Text style={styles.confirmedRowLabel}>
                  {t('checkout.modal.confirmed.reservationFee')}
                </Text>
                <Text style={styles.confirmedRowValue}>
                  {formatKwd(state.order.order.reservationAmountFils)}
                </Text>
              </View>
              <View style={styles.confirmedRow}>
                <Text style={styles.confirmedRowLabel}>
                  {t('checkout.modal.confirmed.expiresAt')}
                </Text>
                <Text style={styles.confirmedRowValue}>
                  {formatExpiresAt(state.order.reservationExpiresAt)}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleContinueToPayment}
              style={styles.primaryCta}
              accessibilityLabel={t('checkout.modal.confirmed.paymentCta')}
            >
              <Text style={styles.primaryCtaText}>
                {t('checkout.modal.confirmed.paymentCta')}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleClose}
              style={styles.secondaryCta}
              accessibilityLabel={t('checkout.modal.confirmed.doLater')}
            >
              <Text style={styles.secondaryCtaText}>
                {t('checkout.modal.confirmed.doLater')}
              </Text>
            </Pressable>
          </View>
        )}

        {state.kind === 'redirecting' && (
          <View style={styles.spinnerBlock}>
            <View style={styles.redirectingIconWrap}>
              <Text style={styles.redirectingGlyph}>↗</Text>
            </View>
            <Text style={styles.spinnerLabel}>
              {t('checkout.modal.redirecting')}
            </Text>
            <Text style={styles.spinnerHint}>
              {t('checkout.modal.redirectingHint')}
            </Text>
          </View>
        )}

        {state.kind === 'error' && (
          <View style={styles.spinnerBlock}>
            <View style={styles.errorIconWrap}>
              <Text style={styles.errorGlyph}>!</Text>
            </View>
            <Text style={styles.errorTitle}>{t('checkout.modal.error.title')}</Text>
            <Text style={styles.errorBody}>{t(errorMessageKey)}</Text>
            <View style={styles.errorActions}>
              <Pressable onPress={handleRetry} style={styles.primaryCtaSmall}>
                <Text style={styles.primaryCtaText}>
                  {t('checkout.modal.error.retry')}
                </Text>
              </Pressable>
              <Pressable onPress={handleClose} style={styles.secondaryCtaSmall}>
                <Text style={styles.secondaryCtaText}>
                  {t('checkout.modal.error.cancel')}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
