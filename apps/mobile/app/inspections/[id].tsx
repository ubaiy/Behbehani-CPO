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
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
  Share,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { brand, slate } from '../../src/theme/colors';

// ─── Palette constants ─────────────────────────────────────────────────────────
const RED_500 = '#EF4444';

// ─── Mock data ─────────────────────────────────────────────────────────────────

type ItemStatus = 'pass' | 'advisory' | 'fail';

interface CheckItem {
  label: string;
  status: ItemStatus;
  note?: string;
}

interface Category {
  id: string;
  name: string;
  score: number;
  items: CheckItem[];
}

interface MockInspection {
  vehicleTitle: string;
  mileage: string;
  transmission: string;
  color: string;
  vinLastSix: string;
  bookingRef: string;
  inspectedOn: string;
  inspector: string;
  overallScore: number;
  verdict: string;
  passCount: number;
  advisoryCount: number;
  failCount: number;
  totalChecks: number;
  categories: Category[];
  photoCount: number;
  inspectorNotes: string;
  inspectorNotesExtra: string;
  inspectorName: string;
  inspectorTitle: string;
  inspectorSignedAt: string;
  customerSignedAt: string | null;
  customerName: string;
  signatureMethod: string;
  hasActiveOffer: boolean;
  offerAmountKwd: string;
  offerValidDays: number;
  offerExpiry: string;
  offerToken: string;
}

const MOCK: MockInspection = {
  vehicleTitle: '2021 Toyota Camry GLE',
  mileage: '42,500 km',
  transmission: 'Automatic',
  color: 'Pearl White',
  vinLastSix: 'A12345',
  bookingRef: 'BMC-CON-001234',
  inspectedOn: 'Mon, 19 May 2026',
  inspector: 'Ahmed K.',
  overallScore: 88,
  verdict: 'Very good condition',
  passCount: 63,
  advisoryCount: 7,
  failCount: 1,
  totalChecks: 71,
  categories: [
    {
      id: 'exterior',
      name: 'Exterior',
      score: 92,
      items: [
        { label: 'Body panels', status: 'pass' },
        { label: 'Paint uniformity', status: 'pass' },
        { label: 'Glass & windscreen', status: 'pass' },
        { label: 'Tires', status: 'pass' },
        { label: 'Exterior lights', status: 'pass' },
        {
          label: 'Rear bumper',
          status: 'fail',
          note: 'Minor scuff on driver-side rear bumper (see photo 14). Cosmetic only.',
        },
      ],
    },
    {
      id: 'mechanical',
      name: 'Mechanical',
      score: 85,
      items: [
        { label: 'Engine', status: 'pass' },
        { label: 'Transmission', status: 'pass' },
        { label: 'Suspension', status: 'pass' },
        { label: 'Brakes', status: 'pass' },
        { label: 'Battery', status: 'advisory', note: 'Battery at 87% — monitor; replace within 12 months.' },
        { label: 'Belts & fluids', status: 'pass' },
      ],
    },
    {
      id: 'electronic',
      name: 'Electronic',
      score: 90,
      items: [
        { label: 'Infotainment', status: 'pass' },
        { label: 'A/C system', status: 'pass' },
        { label: 'Safety sensors', status: 'pass' },
        { label: 'Interior lights', status: 'pass' },
        { label: 'ECU error codes', status: 'advisory', note: '1 non-critical ECU code cleared. No action required.' },
        { label: 'Interior lights', status: 'pass' },
      ],
    },
    {
      id: 'interior',
      name: 'Interior',
      score: 88,
      items: [
        { label: 'Seats & upholstery', status: 'pass' },
        { label: 'Dashboard', status: 'pass' },
        { label: 'Carpets & floor mats', status: 'pass' },
        { label: 'Door trims', status: 'pass' },
        { label: 'Headliner', status: 'advisory' },
        { label: 'Sun visor & mirrors', status: 'pass' },
      ],
    },
    {
      id: 'testdrive',
      name: 'Test Drive',
      score: 86,
      items: [
        { label: 'Acceleration', status: 'pass' },
        { label: 'Braking response', status: 'pass' },
        { label: 'Steering feel', status: 'pass' },
        { label: 'Wheel alignment', status: 'advisory', note: 'Minor pull to right. Alignment recommended at next service.' },
        { label: 'Cabin noise', status: 'pass' },
        { label: 'Idle smoothness', status: 'pass' },
      ],
    },
  ],
  photoCount: 25,
  inspectorNotes:
    'Vehicle is in very good overall condition. Single owner, full service history with Toyota dealer. Minor scuff on driver-side rear bumper (visible in photo 14). All electronics functional. Recommended for CPO certification.',
  inspectorNotesExtra:
    'Service history shows regular Toyota dealer servicing at 10k, 20k, 30k and 40k km intervals. No accident history reported. Paint scan shows original factory paint on all panels. Rear bumper scuff is cosmetic and does not affect structural integrity.',
  inspectorName: 'Ahmed K.',
  inspectorTitle: 'Senior Inspector',
  inspectorSignedAt: 'Mon 19 May 16:42',
  customerSignedAt: null, // toggle in dev: 'Mon 19 May 16:48'
  customerName: 'Abbas Behbehani',
  signatureMethod: 'in-person on inspector tablet',
  hasActiveOffer: true,
  offerAmountKwd: '4,850.000',
  offerValidDays: 7,
  offerExpiry: 'Mon 26 May 2026',
  offerToken: 'test-token-abc123',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === 'pass') {
    return (
      <View style={styles.passIcon}>
        <Text style={styles.passIconText}>✓</Text>
      </View>
    );
  }
  if (status === 'fail') {
    return (
      <View style={styles.failIcon}>
        <Text style={styles.failIconText}>✕</Text>
      </View>
    );
  }
  // advisory — slate dot
  return <View style={styles.advisoryDot} />;
}

interface CategoryCardProps {
  category: Category;
}

function CategoryCard({ category }: CategoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const progress = category.score / 100;

  return (
    <View style={styles.categoryCard}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.categoryHeader}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${category.name} ${category.score} out of 100`}
        android_ripple={{ color: slate[100] }}
      >
        <View style={styles.categoryIconWrap}>
          <Text style={styles.categoryIconGlyph}>
            {category.id === 'exterior' ? '🚗'
              : category.id === 'mechanical' ? '⚙'
              : category.id === 'electronic' ? '⚡'
              : category.id === 'interior' ? '🪑'
              : '🏁'}
          </Text>
        </View>
        <View style={styles.categoryMeta}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>
            <Text style={styles.categoryScore}>{category.score}/100</Text>
          </View>
        </View>
        <Text style={[styles.chevron, expanded && styles.chevronOpen]}>
          {'›'}
        </Text>
      </Pressable>

      {expanded && (
        <View style={styles.categoryItems}>
          {category.items.map((item, idx) => (
            <View key={idx} style={styles.checkRow}>
              <View style={styles.checkRowLeft}>
                <Text style={styles.checkLabel}>{item.label}</Text>
                {item.note ? (
                  <Text style={styles.checkNote}>{item.note}</Text>
                ) : null}
              </View>
              <StatusIcon status={item.status} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Photo thumbnail placeholder ───────────────────────────────────────────────
const PHOTO_GRADIENTS = [
  { background: brand[200] },
  { background: brand[300] },
  { background: brand[100] },
  { background: brand[200] },
  { background: brand[500], opacity: 0.5 },
  { background: brand[300] },
  { background: brand[200] },
];

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function InspectionReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const report = MOCK; // W3: replace with useQuery(['inspection', id])

  // Dev toggle for customer signature state
  const [signed, setSigned] = useState<boolean>(report.customerSignedAt !== null);

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

  const maskedVin = `··· ··· ${report.vinLastSix}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ─── 1. STICKY HEADER ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          style={styles.headerBack}
          onPress={() => router.back()}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <Text style={styles.headerBackIcon}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Inspection report</Text>
        <Pressable
          style={styles.headerShare}
          onPress={handleShare}
          accessibilityLabel="Share inspection report"
          accessibilityRole="button"
        >
          <Text style={styles.headerShareIcon}>{'⎋'}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 3. VEHICLE HEADER CARD ────────────────────────────────── */}
        <View style={styles.vehicleCard}>
          <Text style={styles.vehicleTitle}>{report.vehicleTitle}</Text>
          <Text style={styles.vehicleSubtitle}>
            {report.mileage} · {report.transmission} · {report.color}
          </Text>
          <View style={styles.vehicleMeta}>
            <View style={styles.vehicleMetaRow}>
              <Text style={styles.metaLabel}>VIN</Text>
              <Text style={styles.metaValue}>{maskedVin}</Text>
            </View>
            <View style={styles.vehicleMetaRow}>
              <Text style={styles.metaLabel}>Booking ref</Text>
              <Text style={styles.metaValue}>{report.bookingRef}</Text>
            </View>
            <View style={styles.vehicleMetaRow}>
              <Text style={styles.metaLabel}>Inspected</Text>
              <Text style={[styles.metaValue, styles.metaValueWrap]}>
                {report.inspectedOn} · {report.inspector}
              </Text>
            </View>
          </View>
          <View style={styles.certifiedBadge}>
            <Text style={styles.certifiedBadgeText}>✓ Behbehani Certified Pre-Owned</Text>
          </View>
        </View>

        {/* ─── 4. OVERALL SCORE GAUGE ────────────────────────────────── */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            {/* Circular gauge placeholder — TODO task #40: replace with react-native-svg arc */}
            <View style={styles.gaugeOuter} accessibilityLabel={`Overall score: ${report.overallScore} out of 100`}>
              <View style={styles.gaugeInner}>
                <Text style={styles.gaugeScore}>{report.overallScore}</Text>
                <Text style={styles.gaugeCaption}>out of 100</Text>
              </View>
            </View>
            <View style={styles.verdictBlock}>
              <View style={styles.verdictPill}>
                <Text style={styles.verdictText}>{report.verdict}</Text>
              </View>
              <View style={styles.countsRow}>
                <View style={styles.countItem}>
                  <View style={[styles.countDot, { backgroundColor: brand[700] }]} />
                  <Text style={styles.countLabel}>
                    <Text style={styles.countNumber}>{report.passCount}</Text>
                    {' Pass'}
                  </Text>
                </View>
                <View style={styles.countItem}>
                  <View style={[styles.countDot, { backgroundColor: slate[400] }]} />
                  <Text style={styles.countLabel}>
                    <Text style={styles.countNumber}>{report.advisoryCount}</Text>
                    {' Advisory'}
                  </Text>
                </View>
                <View style={styles.countItem}>
                  <View style={[styles.countDot, { backgroundColor: RED_500 }]} />
                  <Text style={styles.countLabel}>
                    <Text style={styles.countNumber}>{report.failCount}</Text>
                    {' Fail'}
                  </Text>
                </View>
              </View>
              <Text style={styles.totalChecks}>
                {report.totalChecks} total checks · exceeds 80-pt CPO threshold
              </Text>
            </View>
          </View>
        </View>

        {/* ─── 5. CATEGORY BREAKDOWN ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CATEGORY BREAKDOWN</Text>
          {report.categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </View>

        {/* ─── 6. PHOTO GALLERY ──────────────────────────────────────── */}
        <View style={styles.gallerySection}>
          <View style={styles.galleryHeader}>
            <Text style={styles.sectionLabel}>PHOTOS · {report.photoCount} PHOTOS</Text>
            <TouchableOpacity
              onPress={() => console.log('[InspectionReport] View all photos — TODO')}
              accessibilityRole="link"
            >
              <Text style={styles.viewAllLink}>View all</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={[...PHOTO_GRADIENTS, { background: brand[900] }]}
            keyExtractor={(_, i) => String(i)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryStrip}
            renderItem={({ item, index }) => {
              const isLast = index === PHOTO_GRADIENTS.length;
              return (
                <View
                  style={[
                    styles.photoThumb,
                    { backgroundColor: item.background, opacity: (item as any).opacity ?? 1 },
                  ]}
                >
                  {isLast && (
                    <View style={styles.photoOverlay}>
                      <Text style={styles.photoOverlayText}>+17</Text>
                    </View>
                  )}
                </View>
              );
            }}
          />
          <TouchableOpacity
            onPress={() => console.log('[InspectionReport] View all photos — TODO')}
            accessibilityRole="link"
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllLink}>View all {report.photoCount} photos</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 7. INSPECTOR NOTES ────────────────────────────────────── */}
        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>INSPECTOR NOTES</Text>
          <Text style={styles.notesText} numberOfLines={4}>
            {report.inspectorNotes}
          </Text>
          <TouchableOpacity
            onPress={() => console.log('[InspectionReport] Read more — TODO expand')}
            accessibilityRole="button"
          >
            <Text style={styles.readMoreLink}>Read more</Text>
          </TouchableOpacity>
          <View style={styles.notesDivider} />
          <View style={styles.inspectorSignRow}>
            <View>
              <Text style={styles.inspectorName}>{report.inspectorName}</Text>
              <Text style={styles.inspectorTitle}>
                {report.inspectorTitle} · Behbehani Motors
              </Text>
            </View>
            <View style={styles.signedAt}>
              <Text style={styles.signedAtLabel}>Signed</Text>
              <Text style={styles.signedAtTime}>{report.inspectorSignedAt}</Text>
            </View>
          </View>
        </View>

        {/* ─── 8. CUSTOMER SIGNATURE ─────────────────────────────────── */}
        <View style={styles.sigSection}>
          <Text style={styles.sigSectionLabel}>CUSTOMER SIGNATURE</Text>

          {!signed ? (
            /* Awaiting state */
            <View style={styles.sigAwaitingCard}>
              <View style={styles.sigIconWrap}>
                <Text style={styles.sigAwaitingIcon}>{'ℹ'}</Text>
              </View>
              <View style={styles.sigBody}>
                <Text style={styles.sigAwaitingTitle}>Awaiting your signature</Text>
                <Text style={styles.sigAwaitingText}>
                  Your inspector will collect your signature at the visit, or you can sign remotely.
                </Text>
                <TouchableOpacity
                  onPress={handleSignNow}
                  accessibilityRole="link"
                  style={styles.signNowRow}
                >
                  <Text style={styles.signNowText}>Sign remotely via link {'›'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Signed state */
            <View style={styles.sigConfirmedCard}>
              <View style={styles.sigConfirmedIconWrap}>
                <Text style={styles.sigConfirmedIcon}>✓</Text>
              </View>
              <View style={styles.sigBody}>
                <Text style={styles.sigConfirmedTitle}>
                  Signed by {report.customerName}
                </Text>
                <Text style={styles.sigConfirmedMeta}>
                  {report.customerSignedAt ?? 'Mon 19 May 16:48'} · {report.signatureMethod}
                </Text>
                <Text style={styles.sigConfirmedCaption}>
                  Concierge inspection · Customer-acknowledged condition report
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ─── 9. ACTION BUTTONS ─────────────────────────────────────── */}
        <View style={styles.actionsSection}>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
            onPress={handleDownloadPdf}
            accessibilityRole="button"
            accessibilityLabel="Download PDF"
          >
            <Text style={styles.btnPrimaryText}>Download PDF</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnSecondaryPressed]}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share report"
          >
            <Text style={styles.btnSecondaryText}>Share report</Text>
          </Pressable>
          <TouchableOpacity
            onPress={() => console.log('[InspectionReport] Report an issue — TODO')}
            accessibilityRole="button"
            style={styles.btnTertiary}
          >
            <Text style={styles.btnTertiaryText}>Report an issue</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 10. LINKED OFFER CARD ─────────────────────────────────── */}
        {report.hasActiveOffer && (
          <View style={styles.offerCard}>
            <Text style={styles.offerLabel}>OFFER ISSUED</Text>
            <Text style={styles.offerAmount}>KWD {report.offerAmountKwd}</Text>
            <Text style={styles.offerValidity}>
              Valid for {report.offerValidDays} days · expires {report.offerExpiry}
            </Text>
            <View style={styles.offerDivider} />
            <Pressable
              style={({ pressed }) => [styles.offerCta, pressed && styles.offerCtaPressed]}
              onPress={() =>
                router.push(`/offers/${report.offerToken}/view` as Parameters<typeof router.push>[0])
              }
              accessibilityRole="button"
              accessibilityLabel="View offer"
            >
              <Text style={styles.offerCtaText}>View offer {'›'}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: slate[200],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  headerBack: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackIcon: { fontSize: 28, color: slate[700], lineHeight: 36 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 17,
    color: slate[900],
  },
  headerShare: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerShareIcon: { fontSize: 20, color: brand[700] },

  // ── ScrollView ──────────────────────────────────────────────────────────────
  scrollView: { flex: 1, backgroundColor: slate[50] },

  // ── Vehicle card ────────────────────────────────────────────────────────────
  vehicleCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '800',
    fontSize: 16,
    color: slate[900],
    lineHeight: 22,
  },
  vehicleSubtitle: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontWeight: '500',
    fontSize: 13,
    color: slate[500],
    marginTop: 2,
  },
  vehicleMeta: { marginTop: 12, gap: 6 },
  vehicleMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontWeight: '500',
    fontSize: 11,
    color: slate[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    color: slate[700],
  },
  metaValueWrap: { maxWidth: '60%', textAlign: 'right' },
  certifiedBadge: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: slate[100],
  },
  certifiedBadgeText: {
    alignSelf: 'flex-start',
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
    color: brand[700],
    overflow: 'hidden',
  },

  // ── Score card ──────────────────────────────────────────────────────────────
  scoreCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  // Circular gauge: border-based placeholder (TODO task #40: react-native-svg arc)
  gaugeOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 8,
    borderColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: '#FFFFFF',
  },
  gaugeInner: { alignItems: 'center', justifyContent: 'center' },
  gaugeScore: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '800',
    fontSize: 28,
    color: slate[900],
    lineHeight: 32,
  },
  gaugeCaption: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontWeight: '500',
    fontSize: 10,
    color: slate[400],
    marginTop: 2,
  },
  verdictBlock: { flex: 1, gap: 8 },
  verdictPill: {
    alignSelf: 'flex-start',
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  verdictText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 12,
    color: brand[700],
  },
  countsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countDot: { width: 8, height: 8, borderRadius: 4 },
  countLabel: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 12,
    color: slate[700],
  },
  countNumber: { fontWeight: '700' },
  totalChecks: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 10,
    color: slate[400],
  },

  // ── Category breakdown ──────────────────────────────────────────────────────
  section: { marginHorizontal: 16, marginTop: 16 },
  sectionLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 11,
    color: slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    minHeight: 52,
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  categoryIconGlyph: { fontSize: 14 },
  categoryMeta: { flex: 1, minWidth: 0 },
  categoryName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 14,
    color: slate[800],
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: slate[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: brand[600], borderRadius: 3 },
  categoryScore: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 11,
    color: brand[700],
    flexShrink: 0,
  },
  chevron: {
    fontSize: 22,
    color: slate[400],
    flexShrink: 0,
    transform: [{ rotate: '90deg' }],
  },
  chevronOpen: { transform: [{ rotate: '-90deg' }] },
  categoryItems: {
    borderTopWidth: 1,
    borderTopColor: slate[100],
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  checkRowLeft: { flex: 1 },
  checkLabel: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 13,
    color: slate[700],
  },
  checkNote: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 11,
    color: slate[500],
    marginTop: 2,
  },
  passIcon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  passIconText: { fontSize: 14, color: brand[700], fontWeight: '700' },
  failIcon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  failIconText: { fontSize: 14, color: RED_500, fontWeight: '700' },
  advisoryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: slate[400], marginTop: 6, flexShrink: 0 },

  // ── Photo gallery ────────────────────────────────────────────────────────────
  gallerySection: { marginTop: 20, marginHorizontal: 16 },
  galleryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  galleryStrip: { gap: 8 },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  photoOverlayText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '800',
    fontSize: 14,
    color: '#FFFFFF',
  },
  viewAllButton: { marginTop: 8, alignItems: 'center' },
  viewAllLink: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    color: brand[700],
  },

  // ── Inspector notes ──────────────────────────────────────────────────────────
  notesCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 16,
    padding: 16,
  },
  notesLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 10,
    color: brand[700],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  notesText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 13,
    color: slate[700],
    fontStyle: 'italic',
    lineHeight: 20,
  },
  readMoreLink: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    color: brand[700],
    marginTop: 4,
  },
  notesDivider: { borderTopWidth: 1, borderTopColor: brand[200], marginTop: 12, marginBottom: 12 },
  inspectorSignRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  inspectorName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 13,
    color: brand[800],
  },
  inspectorTitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 11,
    color: brand[600],
    marginTop: 2,
  },
  signedAt: { alignItems: 'flex-end' },
  signedAtLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontWeight: '500',
    fontSize: 10,
    color: brand[600],
  },
  signedAtTime: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 10,
    color: slate[500],
  },

  // ── Customer signature ───────────────────────────────────────────────────────
  sigSection: { marginHorizontal: 16, marginTop: 20 },
  sigSectionLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 11,
    color: slate[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 12,
  },
  sigAwaitingCard: {
    backgroundColor: slate[100],
    borderWidth: 1,
    borderColor: slate[300],
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sigIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: slate[200],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  sigAwaitingIcon: { fontSize: 16, color: slate[500] },
  sigBody: { flex: 1 },
  sigAwaitingTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 13,
    color: slate[700],
  },
  sigAwaitingText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 12,
    color: slate[600],
    marginTop: 4,
    lineHeight: 18,
  },
  signNowRow: { marginTop: 8, minHeight: 44, justifyContent: 'center' },
  signNowText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    color: brand[700],
  },
  sigConfirmedCard: {
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sigConfirmedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  sigConfirmedIcon: { fontSize: 16, color: '#FFFFFF', fontWeight: '700' },
  sigConfirmedTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 13,
    color: brand[800],
  },
  sigConfirmedMeta: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 11,
    color: brand[600],
    marginTop: 2,
  },
  sigConfirmedCaption: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 11,
    color: slate[500],
    marginTop: 4,
  },

  // ── Action buttons ───────────────────────────────────────────────────────────
  actionsSection: { marginHorizontal: 16, marginTop: 20, gap: 10 },
  btnPrimary: {
    height: 48,
    borderRadius: 16,
    backgroundColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryPressed: { backgroundColor: brand[800] },
  btnPrimaryText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 14,
    color: '#FFFFFF',
  },
  btnSecondary: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryPressed: { backgroundColor: brand[50] },
  btnSecondaryText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 14,
    color: brand[700],
  },
  btnTertiary: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingTop: 4 },
  btnTertiaryText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontWeight: '500',
    fontSize: 13,
    color: slate[500],
  },

  // ── Offer card ───────────────────────────────────────────────────────────────
  offerCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 16,
    padding: 16,
  },
  offerLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 10,
    color: brand[600],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  offerAmount: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '800',
    fontSize: 22,
    color: brand[900],
  },
  offerValidity: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 12,
    color: brand[700],
    marginTop: 4,
  },
  offerDivider: { borderTopWidth: 1, borderTopColor: brand[200], marginTop: 12, marginBottom: 12 },
  offerCta: {
    height: 40,
    borderRadius: 12,
    backgroundColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerCtaPressed: { backgroundColor: brand[800] },
  offerCtaText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
