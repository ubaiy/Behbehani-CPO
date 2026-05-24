/**
 * Maintenance list — /maintenance
 *
 * Task v0.19.b — customer-facing maintenance pickup surface, reached from
 * the account hub "Maintenance" tile (account.tsx Owning group).
 *
 * Wired to GET /v1/public/me/maintenance-requests via meMaintenanceApiClient
 * (authenticated, 401-refresh handled by httpClient interceptors).
 *
 * Status filter chips: All / Open / Closed
 *   open  → server returns: pending_review | scheduled | in_progress
 *   closed → server returns: completed | cancelled
 *
 * Six visual states (mirrors orders/index.tsx pattern):
 *   1. Loading skeleton  (initial fetch)
 *   2. Empty             (no requests)
 *   3. Error             (network/server — retry CTA)
 *   4. Paginated list    (FlatList, infinite scroll)
 *   5. Fetching-more     (footer spinner)
 *   6. Refresh           (pull-to-refresh)
 *
 * Tap a row → /maintenance/[id]
 * "New request" CTA → /maintenance/new (modal)
 *
 * Hard constraints (Task v0.19.b):
 *   • Touch targets >= 44px rows, >= 48px CTAs
 *   • Brand + slate palette only, no green
 *   • All user-visible strings via t()
 */

import { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { MaintenanceRequestDto, MaintenanceRequestListResponse } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../src/theme/colors';
import { meMaintenanceApiClient } from '../../src/services/http';
import {
  MaintenanceListItem,
  MaintenanceListSkeleton,
  MaintenanceListEmpty,
  MaintenanceListError,
  MaintenanceListFooterLoader,
} from '../../src/components/maintenance';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'open' | 'closed';

const FILTER_TABS: StatusFilter[] = ['all', 'open', 'closed'];

export default function MaintenanceListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<MaintenanceRequestListResponse, Error>({
    queryKey: ['maintenance', 'list', statusFilter],
    queryFn: ({ pageParam }) =>
      meMaintenanceApiClient.list({
        page: (pageParam as number | undefined) ?? 1,
        pageSize: PAGE_SIZE,
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    staleTime: 30_000,
  });

  const items: MaintenanceRequestDto[] =
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
    ({ item }: { item: MaintenanceRequestDto }) => (
      <MaintenanceListItem
        item={item}
        onPress={() =>
          router.push(
            `/maintenance/${item.id}` as Parameters<typeof router.push>[0],
          )
        }
      />
    ),
    [],
  );

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header />
        <FilterChips current={statusFilter} onChange={setStatusFilter} />
        <View style={{ paddingTop: 8 }}>
          <MaintenanceListSkeleton rows={4} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header />
        <FilterChips current={statusFilter} onChange={setStatusFilter} />
        <MaintenanceListError onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  // ─── Empty ───────────────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header />
        <FilterChips current={statusFilter} onChange={setStatusFilter} />
        <MaintenanceListEmpty />
      </SafeAreaView>
    );
  }

  // ─── List ─────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header />
      <FilterChips current={statusFilter} onChange={setStatusFilter} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: 32 + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brand[700]}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isFetchingNextPage ? <MaintenanceListFooterLoader /> : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header() {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backText}>{'‹'}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('maintenance.list.title')}</Text>
      <TouchableOpacity
        style={styles.newBtn}
        onPress={() =>
          router.push('/maintenance/new' as Parameters<typeof router.push>[0])
        }
        accessibilityRole="button"
        accessibilityLabel={t('maintenance.list.newRequestCta')}
      >
        <Text style={styles.newBtnText}>{'+'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

function FilterChips({
  current,
  onChange,
}: {
  current: StatusFilter;
  onChange: (f: StatusFilter) => void;
}) {
  const { t } = useTranslation();

  const labels: Record<StatusFilter, string> = {
    all: t('maintenance.list.filterAll'),
    open: t('maintenance.list.filterOpen'),
    closed: t('maintenance.list.filterClosed'),
  };

  return (
    <View style={styles.filterRow}>
      {FILTER_TABS.map((tab) => {
        const isActive = current === tab;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.filterChip, isActive && styles.filterChipActive]}
            onPress={() => onChange(tab)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
          >
            <Text
              style={[
                styles.filterChipText,
                isActive && styles.filterChipTextActive,
              ]}
            >
              {labels[tab]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  newBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand[50],
    borderRadius: 22,
    borderWidth: 1,
    borderColor: brand[200],
  },
  newBtnText: {
    fontSize: 22,
    color: brand[700],
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 26,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: slate[100],
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    borderColor: brand[700],
    backgroundColor: brand[50],
  },
  filterChipText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: slate[600],
  },
  filterChipTextActive: {
    color: brand[900],
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
