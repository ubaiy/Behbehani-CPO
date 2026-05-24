/**
 * Inspections list — /inspections
 *
 * Task v0.16 — customer-facing inspections surface, reached from the account
 * hub "Inspections" tile (account.tsx line 200 now routes here).
 *
 * Wired to the real GET /v1/public/me/inspections endpoint via
 * meInspectionsApiClient (authenticated, 401-refresh handled).
 *
 * Six visual states (mirrors orders/index.tsx pattern):
 *   1. Loading skeleton  (initial fetch)
 *   2. Empty             (no inspections yet)
 *   3. Error             (network/server — retry CTA)
 *   4. Paginated list    (FlatList, infinite scroll)
 *   5. Fetching-more     (footer spinner)
 *   6. Refresh           (pull-to-refresh)
 *
 * Tap a row → /inspections/[id] (real id from server)
 *
 * Hard constraints (Task v0.16):
 *   • KWD 3-decimal display via shared formatKwd
 *   • VIN uses server-provided vinMasked — no client masking
 *   • Touch target ≥ 48px on each row + CTA
 *   • White + brand + slate palette only
 *   • All user-visible strings via t()
 */

import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { CustomerInspectionListResponse, CustomerInspectionView } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../src/theme/colors';
import { meInspectionsApiClient } from '../../src/services/http';
import {
  InspectionListItem,
  InspectionListSkeleton,
  InspectionListEmpty,
  InspectionListError,
  InspectionListFooterLoader,
} from '../../src/components/inspections/list';

const PAGE_SIZE = 20;

export default function InspectionsListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<CustomerInspectionListResponse, Error>({
    queryKey: ['inspections', 'list'],
    queryFn: ({ pageParam }) =>
      meInspectionsApiClient.list({
        page: (pageParam as number | undefined) ?? 1,
        pageSize: PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    staleTime: 30_000,
  });

  // Flatten the pages into a single array for the FlatList.
  const items: CustomerInspectionView[] =
    data?.pages.flatMap((p) => p.items) ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: CustomerInspectionView }) => (
      <InspectionListItem
        inspection={item}
        onPress={() =>
          router.push(`/inspections/${item.id}` as Parameters<typeof router.push>[0])
        }
      />
    ),
    [],
  );

  // ─── State branches ─────────────────────────────────────────────────────────

  // 1. Loading
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={t('inspection.list.title')} />
        <View style={{ paddingTop: 8 }}>
          <InspectionListSkeleton rows={4} />
        </View>
      </SafeAreaView>
    );
  }

  // 3. Error
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={t('inspection.list.title')} />
        <InspectionListError onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  // 2. Empty
  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={t('inspection.list.title')} />
        <InspectionListEmpty />
      </SafeAreaView>
    );
  }

  // 4–6. List + paginated + refresh
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={t('inspection.list.title')} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brand[700]}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={isFetchingNextPage ? <InspectionListFooterLoader /> : null}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

function Header({ title }: { title: string }) {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('inspection.header.backA11y')}
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backText}>{'‹'}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.backButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: slate[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: slate[200],
    minHeight: 56,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 28,
    color: brand[700],
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 32,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: slate[900],
  },
});
