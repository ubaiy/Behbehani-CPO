/**
 * Vehicle Detail Page (VDP) — apps/mobile/app/listings/[slug].tsx
 *
 * Sprint W2 · Behbehani CPO Kuwait
 *
 * Mirrors mockups/mobile/sprint-M2/04-vdp.html
 *
 * Schema note: ListingPublicSummarySchema is used for the detail fetch
 * (see libs/data-access-mobile/src/lib/listings-public.client.ts).
 * A dedicated ListingPublicDetailSchema with full VIN, inspection scores,
 * etc. does not yet exist. Extended fields (vin, interiorColor, exteriorColor,
 * trim, cylinders, drivetrain, regionalSpecs, doors, seats, previousOwners,
 * accidentFlag, serviceHistory, inspectionScore, inspectionCategories,
 * dealerName, dealerLocation, dealerRating, dealerStock, photoUrls) are
 * typed as `any` from the raw response and handled defensively.
 * TODO: coordinate with API/schema team to ship ListingPublicDetailSchema.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  I18nManager,
  ActivityIndicator,
  Dimensions,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ListingsPublicApiClient } from '@behbehani-cpo/data-access-mobile';
import { brand, slate } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/theme';

// ─── VDP Sub-components ───────────────────────────────────────────────────────
import { PhotoGallery } from '../../src/components/vdp/PhotoGallery';
import { WalkaroundVideoStub } from '../../src/components/vdp/WalkaroundVideoStub';
import { VdpTitleBlock } from '../../src/components/vdp/VdpTitleBlock';
import { SecondaryCTARow } from '../../src/components/vdp/SecondaryCTARow';
import { SpecsBlock } from '../../src/components/vdp/SpecsBlock';
import { VehicleHistoryCard } from '../../src/components/vdp/VehicleHistoryCard';
import { InspectionReportEmbed } from '../../src/components/vdp/InspectionReportEmbed';
import { MonthlyCalculator } from '../../src/components/vdp/MonthlyCalculator';
import { InsuranceStub } from '../../src/components/vdp/InsuranceStub';
import { DealerCard } from '../../src/components/vdp/DealerCard';
import { SimilarCarsRail } from '../../src/components/vdp/SimilarCarsRail';
import { ReserveStickyCTA } from '../../src/components/vdp/ReserveStickyCTA';
import { ShareIcon, HeartIcon } from '../../src/components/vdp/vdp.icons';

// ─── Types ────────────────────────────────────────────────────────────────────
import { ListingDetail, InspectionCategory } from '../../src/components/vdp/vdp.types';
import { filsToKWD, computeMonthly, DEFAULT_DOWN_PCT } from '../../src/components/vdp/vdp.helpers';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── API Client ───────────────────────────────────────────────────────────────

const httpClient = axios.create({ baseURL: process.env['EXPO_PUBLIC_API_URL'] ?? '' });
const listingsClient = new ListingsPublicApiClient(httpClient);

const rtlChevron = I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : {};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function VDPScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  // Gallery state
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  // Finance calculator state
  const [downPct, setDownPct] = useState(DEFAULT_DOWN_PCT);
  const [tenure, setTenure] = useState<24 | 36 | 48 | 60>(60);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['listings', 'detail', slug],
    queryFn: () => listingsClient.getBySlug(slug ?? ''),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });

  const { data: similarData } = useQuery({
    queryKey: ['listings', 'featured'],
    queryFn: () => listingsClient.featured(),
    staleTime: 5 * 60 * 1000,
  });

  // Cast to extended shape — real API returns a superset
  const detail = listing as ListingDetail | undefined;

  // Photos array — extract URLs from the canonical photos[] objects
  // (PublicListingDetailDto.photos: { url, caption?, isHero?, width?, height? }[])
  const photos: string[] = detail?.photos?.length
    ? detail.photos.map((p) => p.url)
    : detail?.heroPhotoUrl
    ? [detail.heroPhotoUrl]
    : [];

  const totalPhotos = Math.max(photos.length, 25); // Display "/ 25" as per mockup placeholder

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    if (!detail) return;
    try {
      await Share.share({
        url: `https://www.behbehani-motors.com/en/cars/${slug}`,
        title: detail.titleEn,
        message: detail.titleEn,
      });
    } catch {
      // User dismissed — no-op
    }
  }, [detail, slug]);

  const handleFavorite = useCallback(() => {
    setIsFavorited((prev) => !prev);
  }, []);

  const handleReserve = useCallback(() => {
    // Task G1: route into the single-screen reserve flow which mirrors A's
    // web v1.4.11 checkout-modal (payment-method picker → POST /orders →
    // POST /orders/:id/payment-init → Otto hosted-checkout → payment-return).
    if (!detail?.id) return;
    router.push(`/reserve/${detail.id}` as Parameters<typeof router.push>[0]);
  }, [detail?.id]);

  const handleViewFullReport = useCallback(() => {
    console.log('TODO: full inspection report for', slug);
  }, [slug]);

  const handleViewHistory = useCallback(() => {
    console.log('TODO: full vehicle history for', slug);
  }, [slug]);

  const handleGalleryScroll = useCallback((e: any) => {
    if (photos.length === 0) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPhoto(Math.max(0, Math.min(index, photos.length - 1)));
  }, [photos.length]);

  // ─── Loading / error ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={brand[800]} />
      </View>
    );
  }

  if (isError || !detail) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('vdp.errorLoad')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.errorBack}>
          <Text style={styles.errorBackText}>{t('vdp.errorGoBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Derived values ──────────────────────────────────────────────────────────

  const priceFils = detail.priceFils;
  const priceKWD = filsToKWD(priceFils);
  const downKWD = priceKWD * (downPct / 100);
  const monthlyEst = computeMonthly(priceFils, downPct, tenure);

  // Map canonical inspectionReport (PublicListingDetailDto) → local InspectionCategory[]
  // Server returns categories as flat numbers 0-100; we normalise to {score, maxScore=100}.
  // Category names are translated via vdp.inspCategory* keys.
  const inspReport = detail.inspectionReport;
  const inspCategories: InspectionCategory[] = inspReport
    ? [
        { name: t('vdp.inspCategoryExterior'),   score: inspReport.categories.exterior,   maxScore: 100 },
        { name: t('vdp.inspCategoryMechanical'), score: inspReport.categories.mechanical, maxScore: 100 },
        { name: t('vdp.inspCategoryElectronic'), score: inspReport.categories.electronic, maxScore: 100 },
        { name: t('vdp.inspCategoryInterior'),   score: inspReport.categories.interior,   maxScore: 100 },
        { name: t('vdp.inspCategoryTestDrive'),  score: inspReport.categories.testDrive,  maxScore: 100 },
      ]
    : [
        { name: t('vdp.inspCategoryExterior'), score: 38, maxScore: 40 },
        { name: t('vdp.inspCategoryMechanical'), score: 40, maxScore: 40 },
        { name: t('vdp.inspCategoryElectronic'), score: 30, maxScore: 30 },
        { name: t('vdp.inspCategoryInterior'), score: 38, maxScore: 40 },
        { name: t('vdp.inspCategoryTestDrive'), score: 46, maxScore: 50 },
      ];
  const inspScore = inspReport?.overallScore ?? 96;
  const inspGaugePct = inspScore / 100;

  const similarItems = (similarData?.items ?? []).filter((i) => i.slug !== slug).slice(0, 5);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Overlay header buttons — rendered outside ScrollView to stay on top of gallery */}
      <View style={styles.headerOverlay} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.headerCircleBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('vdp.back')}
        >
          <Text style={[styles.chevronText, rtlChevron]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={handleShare}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={t('vdp.shareA11y')}
          >
            <ShareIcon />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={handleFavorite}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={isFavorited ? t('vdp.removeFromFavorites') : t('vdp.addToFavorites')}
          >
            <HeartIcon filled={isFavorited} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <PhotoGallery
          photos={photos}
          currentPhoto={currentPhoto}
          totalPhotos={totalPhotos}
          onScroll={handleGalleryScroll}
          onThumbnailPress={setCurrentPhoto}
        />

        <WalkaroundVideoStub />

        <VdpTitleBlock
          detail={detail}
          priceFils={priceFils}
          monthlyFils={detail.monthlyFils}
        />

        <SecondaryCTARow />

        <SpecsBlock detail={detail} />

        <VehicleHistoryCard detail={detail} onViewHistory={handleViewHistory} />

        <InspectionReportEmbed
          inspScore={inspScore}
          inspGaugePct={inspGaugePct}
          inspCategories={inspCategories}
          inspectionDate={undefined /* TODO: surface inspectionReport.signedAt when shipped */}
          onViewFullReport={handleViewFullReport}
        />

        <MonthlyCalculator
          priceFils={priceFils}
          downPct={downPct}
          tenure={tenure}
          downKWD={downKWD}
          monthlyEst={monthlyEst}
          onDownPctChange={setDownPct}
          onTenureChange={setTenure}
        />

        <InsuranceStub />

        {detail.dealerName ? (
          <DealerCard dealerName={detail.dealerName} dealerLocation={detail.dealerLocation} />
        ) : null}

        <SimilarCarsRail
          items={similarItems}
          onItemPress={(itemSlug) => router.push(`/listings/${itemSlug}` as any)}
        />

        {/* Bottom padding so content clears the sticky CTA bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <ReserveStickyCTA onReserve={handleReserve} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: slate[100],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: slate[700],
    fontFamily: fontFamily.medium,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorBack: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: brand[800],
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBackText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
  },
  headerOverlay: {
    position: 'absolute',
    top: 44 + 8, // below status bar
    left: 16,
    right: 16,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRightRow: {
    flexDirection: 'row',
    gap: 8,
  },
  headerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 28,
  },
  bottomSpacer: {
    height: 100,
  },
});
