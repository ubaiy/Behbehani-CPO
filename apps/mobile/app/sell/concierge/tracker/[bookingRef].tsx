/**
 * Sell Concierge Tracker — /sell/concierge/tracker/[bookingRef]
 * Task v0.22.b
 *
 * Sections (mirrors A's v1.5-D5 tracker, adapted for React Native):
 *   1. Booking ref hero (chip + copy)
 *   2. Signed-state hero — brand-blue when signed_off (NOT emerald per v1.5-D1)
 *   3. 4-step timeline: received → assigned → inspected → signed
 *   4. Inspector card (gradient avatar + brand-700 star)
 *   5. 3-up quick actions: calendar / reschedule / cancel
 *   6. Report CTA — disabled with "Report available with your offer" (v1.5-D5 carry-over)
 *
 * reportLink: null until B extends DTO with inspection report ID.
 * Never crashes — all nullable fields guarded.
 */

import { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { ConciergeBookingStatus, InspectionStatus } from '@behbehani-cpo/shared-types';
import * as WebBrowser from 'expo-web-browser';
import { brand, slate } from '../../../../src/theme/colors';
import { meSellBookingsApiClient } from '../../../../src/services/http';
import { sellBookingsKeys } from '../../../../src/services/sell-bookings.keys';
import { formatDate } from '../../../../src/components/orders/orders.utils';
import {
  BookingRefHero,
  BookingTimeline,
  InspectorCard,
  QuickActionsRow,
  ReportCtaDisabled,
} from '../../../../src/components/sell-tracker';
import type { InspectorInfo } from '../../../../src/components/sell-tracker';

// ─── Signed-state hero ────────────────────────────────────────────────────────
// brand-blue (NOT emerald) per v1.5-D1 brand-lock.

function SignedStateHero({ vehicleLine }: { vehicleLine: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.signedHero}>
      <Text style={styles.signedHeroIcon}>✓</Text>
      <Text style={styles.signedHeroTitle}>
        {t('sellTracker.signed.title', 'Inspection complete!')}
      </Text>
      <Text style={styles.signedHeroSub}>
        {t('sellTracker.signed.sub', {
          vehicle: vehicleLine,
          defaultValue: `Your ${vehicleLine} inspection is done. Your offer is on its way.`,
        })}
      </Text>
    </View>
  );
}

// ─── Inspector info builder ───────────────────────────────────────────────────
// B v1.5.14 evolved the inspector shape on ConciergeBookingStatus.
// Legacy fields (name, phoneE164) are kept @deprecated but still present.
// We prefer the new richer fields with safe fallbacks to legacy values.
//
// When B's `inspector` is null, or no phone is available, return null so the
// card falls back to the "will be assigned shortly" placeholder. The card's
// WhatsApp + Call buttons require a real number — broken `tel:` / `wa.me/`
// links are worse than hiding the card.

function buildInspectorInfo(data: ConciergeBookingStatus): InspectorInfo | null {
  if (!data.inspectorAssigned) return null;
  const inspector = data.inspector;
  if (!inspector) return null;

  // Prefer new field, fall back to legacy.
  const fullName = (inspector as { fullName?: string }).fullName ?? inspector.name ?? '';
  if (!fullName) return null;

  // Prefer whatsappE164 (new), fall back to phoneE164 (legacy).
  const phone = (inspector as { whatsappE164?: string | null }).whatsappE164 ?? inspector.phoneE164 ?? '';
  if (!phone) return null;

  const tokens = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = tokens[0] ?? fullName;

  // Prefer server-computed initials (new); do not recompute client-side if available.
  const initials = (inspector as { initials?: string }).initials ??
    (tokens.length === 1
      ? tokens[0]!.charAt(0).toUpperCase()
      : (tokens[0]!.charAt(0) + tokens[tokens.length - 1]!.charAt(0)).toUpperCase());

  // Use server values when available, keep previous defaults when not yet populated.
  const rating = (inspector as { rating?: string }).rating ?? '5.0';
  const completedCount = (inspector as { completedCount?: number }).completedCount ?? 0;

  return {
    fullName,
    initials,
    firstName,
    rating,
    completedCount,
    whatsappE164: phone,
    callE164: phone,
  };
}

// ─── Vehicle line ─────────────────────────────────────────────────────────────

function vehicleLine(data: ConciergeBookingStatus): string {
  const v = data.vehicle;
  return [v.year, v.brand, v.model].filter(Boolean).join(' ') || 'Your vehicle';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SellTrackerScreen() {
  const { bookingRef } = useLocalSearchParams<{ bookingRef: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: sellBookingsKeys.detail(bookingRef ?? ''),
    queryFn: () => meSellBookingsApiClient.getByRef(bookingRef ?? ''),
    enabled: Boolean(bookingRef),
    staleTime: 30_000,
  });

  const handleRescheduleSuccess = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleCancelSuccess = useCallback(() => {
    void refetch();
  }, [refetch]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header bookingRef={bookingRef ?? ''} />
        <View style={styles.centerFlex}>
          <ActivityIndicator color={brand[700]} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header bookingRef={bookingRef ?? ''} />
        <View style={styles.centerFlex}>
          <Text style={styles.errorTitle}>
            {t('sellTracker.error.title', "Couldn't load this booking")}
          </Text>
          <Text style={styles.errorSub}>
            {t('sellTracker.error.hint', 'Pull to refresh, or try again later.')}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void refetch()}
            accessibilityRole="button"
          >
            <Text style={styles.retryBtnText}>{t('myBookings.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status: InspectionStatus = data.status;
  const isSigned = status === 'signed_off';
  const inspectorInfo = buildInspectorInfo(data);
  const carLine = vehicleLine(data);

  // Report CTA decision tree (B v1.5.14):
  //   1. relatedOfferToken → navigate to offer inspection-report page
  //   2. inspectionReportPdfUrl → open in browser
  //   3. else → render disabled placeholder
  const relatedOfferToken = (data as { relatedOfferToken?: string | null }).relatedOfferToken ?? null;
  const inspectionReportPdfUrl = (data as { inspectionReportPdfUrl?: string | null }).inspectionReportPdfUrl ?? null;
  const cancelledAt = (data as { cancelledAt?: string | null }).cancelledAt ?? null;

  const handleReportCtaTap = useCallback(() => {
    if (relatedOfferToken) {
      router.push(`/offers/${relatedOfferToken}/inspection-report` as Parameters<typeof router.push>[0]);
    } else if (inspectionReportPdfUrl) {
      void WebBrowser.openBrowserAsync(inspectionReportPdfUrl);
    }
  }, [relatedOfferToken, inspectionReportPdfUrl]);

  const reportCtaEnabled = Boolean(relatedOfferToken || inspectionReportPdfUrl);

  // TODO(v0.27): surface overallScore badge when design is ready.

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header bookingRef={bookingRef ?? ''} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={brand[700]}
            colors={[brand[700]]}
          />
        }
      >
        {/* 1. Booking ref hero */}
        <BookingRefHero bookingRef={data.bookingRef} />

        {/* Cancellation chip — shown when cancelledAt is present */}
        {cancelledAt ? (
          <CancelledChip cancelledAt={cancelledAt} />
        ) : null}

        {/* 2. Signed-state hero (brand-blue, only when signed_off) */}
        {isSigned ? <SignedStateHero vehicleLine={carLine} /> : null}

        {/* 3. 4-step timeline */}
        <BookingTimeline data={data} formatDate={formatDate} />

        {/* 4. Inspector card */}
        <InspectorCard inspector={inspectorInfo} />

        {/* 5. 3-up quick actions */}
        <QuickActionsRow
          booking={data}
          bookingRef={data.bookingRef}
          onRescheduleSuccess={handleRescheduleSuccess}
          onCancelSuccess={handleCancelSuccess}
        />

        {/* 6. Report CTA — enabled when relatedOfferToken or inspectionReportPdfUrl is present */}
        {reportCtaEnabled ? (
          <ReportCtaEnabled onPress={handleReportCtaTap} />
        ) : (
          <ReportCtaDisabled />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Cancelled chip ───────────────────────────────────────────────────────────

function CancelledChip({ cancelledAt }: { cancelledAt: string }) {
  const { t } = useTranslation();
  const humanDate = formatDate(cancelledAt);
  return (
    <View style={styles.cancelledChip}>
      <Text style={styles.cancelledChipText}>
        {t('sellTracker.tracker.cancelled.chip', 'Cancelled · {{date}}', { date: humanDate })}
      </Text>
    </View>
  );
}

// ─── Report CTA (enabled) ─────────────────────────────────────────────────────

function ReportCtaEnabled({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.reportCtaContainer}>
      <Text style={styles.reportCtaLabel}>
        {t('sellTracker.reportCta.label', 'INSPECTION REPORT')}
      </Text>
      <TouchableOpacity
        style={styles.reportCtaBtn}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('sellTracker.reportCta.label', 'INSPECTION REPORT')}
      >
        <Text style={styles.reportCtaBtnText}>
          {t('sellTracker.reportCta.viewReport', 'View report')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ bookingRef }: { bookingRef: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('common.back', 'Back')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {bookingRef || t('sellTracker.header.title', 'Booking tracker')}
      </Text>
      <View style={styles.backBtn} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: slate[200],
    backgroundColor: '#FFFFFF',
    minHeight: 56,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backIcon: {
    fontSize: 22,
    color: brand[700],
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: slate[900],
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  centerFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: slate[900],
    textAlign: 'center',
  },
  errorSub: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: slate[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    minHeight: 48,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: brand[700],
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  retryBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },

  // Cancellation chip — slate pill (not red; cancellation is neutral state info)
  cancelledChip: {
    alignSelf: 'flex-start',
    backgroundColor: slate[100],
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: slate[300],
  },
  cancelledChipText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: slate[600],
  },

  // Report CTA (enabled) — brand-700 primary button
  reportCtaContainer: {
    backgroundColor: slate[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: slate[200],
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  reportCtaLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: slate[500],
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  reportCtaBtn: {
    minHeight: 48,
    borderRadius: 9999,
    backgroundColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  reportCtaBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Signed-state hero — brand-blue, NOT emerald
  signedHero: {
    backgroundColor: brand[700],
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 10,
  },
  signedHeroIcon: {
    fontSize: 36,
    color: '#FFFFFF',
  },
  signedHeroTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  signedHeroSub: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: brand[100],
    textAlign: 'center',
    lineHeight: 20,
  },
});
