/**
 * My Sell-Bookings list screen (Task v0.22.b).
 *
 * Displays the authenticated customer's history of submitted sell-concierge
 * bookings with live status. Mirrors A's my-bookings.component.ts (Angular web)
 * adapted to React Native + Expo Router.
 *
 * Query: useInfiniteQuery → meSellBookingsApiClient.list
 * States: loading / empty / error+retry / list / fetching-more / refreshing
 *
 * Tap a row → /sell/concierge/tracker/[bookingRef]
 * Empty CTA → /(tabs)/sell
 */

import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { CustomerInspectionView } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../src/theme/colors';
import { meSellBookingsApiClient } from '../../src/services/http';
import { sellBookingsKeys } from '../../src/services/sell-bookings.keys';
import {
  SellBookingListItem,
  SellBookingListSkeleton,
  SellBookingListEmpty,
  SellBookingListError,
  SellBookingListFooterLoader,
} from '../../src/components/my-bookings';

const PAGE_SIZE = 20;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MyBookingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: sellBookingsKeys.all,
    queryFn: async ({ pageParam = 1 }) =>
      meSellBookingsApiClient.list({ page: pageParam as number, pageSize: PAGE_SIZE }),
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const allItems: CustomerInspectionView[] = data?.pages.flatMap((p) => p.items) ?? [];
  const isEmpty = !isLoading && !isError && allItems.length === 0;

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const navigateToTracker = useCallback((bookingRef: string) => {
    router.push(`/sell/concierge/tracker/${encodeURIComponent(bookingRef)}` as Parameters<typeof router.push>[0]);
  }, []);

  // ── Render item ─────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: CustomerInspectionView }) => (
      <SellBookingListItem
        booking={item}
        onPress={() => navigateToTracker(item.bookingRef)}
      />
    ),
    [navigateToTracker],
  );

  const keyExtractor = useCallback((item: CustomerInspectionView) => item.id, []);

  // ── States ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title={t('myBookings.title', 'My Bookings')} />
        <SellBookingListSkeleton rows={5} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title={t('myBookings.title', 'My Bookings')} />
        <SellBookingListError onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  if (isEmpty) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title={t('myBookings.title', 'My Bookings')} />
        <SellBookingListEmpty onBrowseSell={() => router.push('/(tabs)/sell')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header title={t('myBookings.title', 'My Bookings')} />
      <FlatList
        data={allItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.25}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void handleRefresh()}
            tintColor={brand[700]}
            colors={[brand[700]]}
          />
        }
        ListFooterComponent={isFetchingNextPage ? <SellBookingListFooterLoader /> : null}
      />
    </SafeAreaView>
  );
}

// ─── Sticky header ────────────────────────────────────────────────────────────

function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      {/* spacer for symmetric layout */}
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
    fontSize: 17,
    color: slate[900],
    textAlign: 'center',
  },
});
