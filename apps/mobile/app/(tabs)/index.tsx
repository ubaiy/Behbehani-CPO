/**
 * Home tab — Sprint M2.
 *
 * Structure (top-down):
 *   1. Sticky header: logo + greeting + search bar + trust-badge strip
 *   2. Featured Used rail
 *   3. Shop by Body Type 3×3 grid
 *   4. Shop by Price Range chip row
 *   5. Sell Your Car CTA card
 *   6. Inspected Cars rail
 *   7. Low-Mileage rail
 *   8. Recently Added rail
 *   9. Price Drops rail
 *  10. How It Works 3-step explainer
 *  11. Bottom safe-area spacer
 *
 * Data: react-query useQuery backed by listingsPublicApiClient.
 * Cache keys follow ARCHITECTURE.md §3 conventions.
 */

import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listingsPublicApiClient } from '../../src/services/http';
import { brand } from '../../src/theme/colors';

import { Header } from '../../src/components/home/Header';
import { ListingRail } from '../../src/components/home/ListingRail';
import { BodyTypeGrid } from '../../src/components/home/BodyTypeGrid';
import { PriceRangeChips } from '../../src/components/home/PriceRangeChips';
import { SellYourCarCTA } from '../../src/components/home/SellYourCarCTA';
import { HowItWorksSection } from '../../src/components/home/HowItWorksSection';

// ─── Rail query hooks ─────────────────────────────────────────────────────────

function useInspectedQuery() {
  return useQuery({
    queryKey: ['listings', 'list', { inspected: true }] as const,
    queryFn: () => listingsPublicApiClient.list({ sort: 'featured', pageSize: 8 }),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.items.filter((l) => l.inspected),
  });
}

function useRecentQuery() {
  return useQuery({
    queryKey: ['listings', 'list', { sort: 'newest' }] as const,
    queryFn: () => listingsPublicApiClient.list({ sort: 'newest', pageSize: 8 }),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.items,
  });
}

function usePriceDropQuery() {
  return useQuery({
    queryKey: ['listings', 'list', { badge: 'priceDrop' }] as const,
    queryFn: () => listingsPublicApiClient.list({ sort: 'featured', pageSize: 8 }),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.items.filter((l) => l.badge === 'priceDrop'),
  });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const featuredQuery = useQuery({
    queryKey: ['listings', 'featured'] as const,
    queryFn: () => listingsPublicApiClient.featured(),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.items,
  });

  const lowMileageQuery = useQuery({
    queryKey: ['listings', 'low-mileage'] as const,
    queryFn: () => listingsPublicApiClient.lowMileage(),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.items,
  });

  const inspectedQuery = useInspectedQuery();
  const recentQuery = useRecentQuery();
  const priceDropQuery = usePriceDropQuery();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['listings'] });
    setRefreshing(false);
  }, [queryClient]);

  function navigateToBrowseBody(slug: string) {
    router.push(`/(tabs)/browse?body=${slug}` as never);
  }

  function navigateToBrowseBudget(maxFils: number | null) {
    if (maxFils === null) {
      router.push('/(tabs)/browse' as never);
    } else {
      router.push(`/(tabs)/browse?budgetMaxFils=${maxFils}` as never);
    }
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <Header />

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brand[700]}
            colors={[brand[700]]}
          />
        }
      >
        <ListingRail
          title={t('home.railFeatured')}
          seeAllHref="/(tabs)/browse"
          data={featuredQuery.data as never}
          isLoading={featuredQuery.isLoading}
          isError={featuredQuery.isError}
          onRefetch={() => featuredQuery.refetch()}
          onSeeAll={() => router.push('/(tabs)/browse' as never)}
        />

        <BodyTypeGrid onPress={navigateToBrowseBody} />

        <PriceRangeChips onPress={navigateToBrowseBudget} />

        <SellYourCarCTA onPress={() => router.push('/(tabs)/sell' as never)} />

        <ListingRail
          title={t('home.railInspected')}
          seeAllHref="/(tabs)/browse"
          data={inspectedQuery.data as never}
          isLoading={inspectedQuery.isLoading}
          isError={inspectedQuery.isError}
          onRefetch={() => inspectedQuery.refetch()}
          onSeeAll={() => router.push('/(tabs)/browse' as never)}
          skeletonCount={2}
        />

        <ListingRail
          title={t('home.railLowMileage')}
          seeAllHref="/(tabs)/browse?sort=mileageAsc"
          data={lowMileageQuery.data as never}
          isLoading={lowMileageQuery.isLoading}
          isError={lowMileageQuery.isError}
          onRefetch={() => lowMileageQuery.refetch()}
          onSeeAll={() => router.push('/(tabs)/browse?sort=mileageAsc' as never)}
        />

        <ListingRail
          title={t('home.railRecent')}
          seeAllHref="/(tabs)/browse?sort=newest"
          data={recentQuery.data as never}
          isLoading={recentQuery.isLoading}
          isError={recentQuery.isError}
          onRefetch={() => recentQuery.refetch()}
          onSeeAll={() => router.push('/(tabs)/browse?sort=newest' as never)}
          skeletonCount={2}
        />

        <ListingRail
          title={t('home.railPriceDrops')}
          seeAllHref="/(tabs)/browse"
          data={priceDropQuery.data as never}
          isLoading={priceDropQuery.isLoading}
          isError={priceDropQuery.isError}
          onRefetch={() => priceDropQuery.refetch()}
          onSeeAll={() => router.push('/(tabs)/browse' as never)}
          skeletonCount={2}
        />

        <HowItWorksSection />

        <View style={s.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  bottomSpacer: {
    height: 32,
  },
});
