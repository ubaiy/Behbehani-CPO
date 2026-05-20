/**
 * Orders list — /orders
 *
 * Task #65 — customer-facing orders surface, reached from the account hub
 * "Inspections / Purchase history" group (hub itself still routes to Coming
 * Soon for purchase history per #65 scope; this screen is the real /orders
 * landing for direct deep-links and future hub rewiring).
 *
 * Mirrors A's web /account/orders page — six visual states:
 *   1. Loading skeleton  (initial fetch)
 *   2. Empty             (no orders yet — CTA to browse)
 *   3. Error             (network/server — retry CTA)
 *   4. Paginated list    (FlatList, infinite scroll)
 *   5. Fetching-more     (footer spinner)
 *   6. Refresh           (pull-to-refresh)
 *
 * Tap a row → /orders/[id]
 *
 * Hard constraints (Task #65):
 *   • KWD 3-decimal display (formatKwd)
 *   • Touch target ≥ 48px on each row + CTA
 *   • White + brand + slate palette only — no amber/green
 */

import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type {
  OrderListResponseDto,
  OrderSummaryDto,
} from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../src/theme/colors';
import { ordersPublicApiClient } from '../../src/services/http';
import {
  OrderListItem,
  OrderListSkeleton,
  OrderListEmpty,
  OrderListError,
  OrderListFooterLoader,
} from '../../src/components/orders';

const PAGE_SIZE = 20;

export default function OrdersListScreen() {
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
  } = useInfiniteQuery<OrderListResponseDto, Error>({
    queryKey: ['orders', 'list'],
    queryFn: ({ pageParam }) =>
      ordersPublicApiClient.list({
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
  const items: OrderSummaryDto[] =
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
    ({ item }: { item: OrderSummaryDto }) => (
      <OrderListItem
        order={item}
        onPress={() =>
          router.push(`/orders/${item.id}` as Parameters<typeof router.push>[0])
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
        <Header title={t('orders.list.headerTitle')} />
        <View style={{ paddingTop: 8 }}>
          <OrderListSkeleton rows={4} />
        </View>
      </SafeAreaView>
    );
  }

  // 3. Error
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={t('orders.list.headerTitle')} />
        <OrderListError onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  // 2. Empty
  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={t('orders.list.headerTitle')} />
        <OrderListEmpty
          onBrowse={() =>
            router.push('/(tabs)/browse' as Parameters<typeof router.push>[0])
          }
        />
      </SafeAreaView>
    );
  }

  // 4–6. List + paginated + refresh
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={t('orders.list.headerTitle')} />
      <FlatList
        data={items}
        keyExtractor={(o) => o.id}
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
        ListFooterComponent={isFetchingNextPage ? <OrderListFooterLoader /> : null}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: slate[50],
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: slate[200],
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: slate[900],
  },
});
