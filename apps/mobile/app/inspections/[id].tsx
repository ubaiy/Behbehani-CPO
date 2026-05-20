/**
 * Inspection Report Viewer — /inspections/:id
 *
 * Customer-facing read-only view of a Concierge inspection report.
 * Mirrors: mockups/mobile/sprint-M2/15-inspection-report.html
 *
 * Mock data only — W3 wires to GET /v1/public/me/inspections/:id
 *
 * Palette: white + Royal Blue (brand 50-900) + slate.
 * Red-500 ONLY for failed inspection items. No amber/yellow/gold/emerald/green.
 * VIN: last-6 masked on customer surfaces (server returns full VIN; mobile masks client-side).
 * KWD: 3 decimals on offer card. Touch targets ≥ 44px. CTAs ≥ 48px.
 */

import { useState } from 'react';
import { ScrollView, Share, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { slate } from '../../src/theme/colors';
import {
  ActionButtons,
  ActiveOfferCard,
  CategoryBreakdown,
  CustomerSignaturePanel,
  InspectionHeader,
  InspectorNotesCard,
  MOCK,
  OverallScoreCard,
  PhotoGalleryStrip,
  VehicleHeaderCard,
} from '../../src/components/inspections';

export default function InspectionReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const report = MOCK; // W3: replace with useQuery(['inspection', id])

  // Dev toggle for customer signature state
  const [signed] = useState<boolean>(report.customerSignedAt !== null);

  const handleShare = async () => {
    try {
      await Share.share({
        title: `Inspection Report — ${report.vehicleTitle}`,
        url: `https://www.behbehani-motors.com/inspections/${id}`,
      });
    } catch {
      // Share dismissed or error — no-op
    }
  };

  const handleSignNow = () => {
    router.push(`/inspection-sign/test-token-abc123` as Parameters<typeof router.push>[0]);
  };

  const handleDownloadPdf = () => {
    // TODO (W3): expo-file-system + signed-URL fetch
    console.log('[InspectionReport] Download PDF — TODO');
  };

  const handleViewOffer = () => {
    router.push(`/offers/${report.offerToken}/view` as Parameters<typeof router.push>[0]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ─── 1. STICKY HEADER ─────────────────────────────────────────── */}
      <InspectionHeader onBack={() => router.back()} onShare={handleShare} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 3. VEHICLE HEADER CARD ────────────────────────────────── */}
        <VehicleHeaderCard report={report} />

        {/* ─── 4. OVERALL SCORE GAUGE ────────────────────────────────── */}
        <OverallScoreCard report={report} />

        {/* ─── 5. CATEGORY BREAKDOWN ─────────────────────────────────── */}
        <CategoryBreakdown categories={report.categories} />

        {/* ─── 6. PHOTO GALLERY ──────────────────────────────────────── */}
        <PhotoGalleryStrip photoCount={report.photoCount} />

        {/* ─── 7. INSPECTOR NOTES ────────────────────────────────────── */}
        <InspectorNotesCard report={report} />

        {/* ─── 8. CUSTOMER SIGNATURE ─────────────────────────────────── */}
        <CustomerSignaturePanel signed={signed} report={report} onSignNow={handleSignNow} />

        {/* ─── 9. ACTION BUTTONS ─────────────────────────────────────── */}
        <ActionButtons onDownloadPdf={handleDownloadPdf} onShare={handleShare} />

        {/* ─── 10. LINKED OFFER CARD ─────────────────────────────────── */}
        {report.hasActiveOffer && <ActiveOfferCard report={report} onViewOffer={handleViewOffer} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1, backgroundColor: slate[50] },
});
