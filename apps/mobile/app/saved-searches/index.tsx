/**
 * Saved Searches list — /saved-searches
 *
 * v1.5.3 — customer-facing saved-search surface, reached from the account
 * hub "Saved Searches" tile (account.tsx now routes here).
 *
 * Wired to the real GET /v1/public/me/saved-searches endpoint via
 * meSavedSearchesApiClient (authenticated, 401-refresh handled).
 *
 * Six visual states (mirrors inspections/index.tsx pattern):
 *   1. Loading skeleton  (initial fetch)
 *   2. Empty             (no saved searches yet)
 *   3. Error             (network/server — retry CTA)
 *   4. Paginated list    (FlatList, infinite scroll)
 *   5. Fetching-more     (footer spinner)
 *   6. Refresh           (pull-to-refresh)
 *
 * Each row:
 *   - Name + filter summary line
 *   - "Run" → navigates to /(tabs)/browse with filters applied via query-state
 *   - "Delete" → opens DeleteConfirmModal, then calls DELETE endpoint
 */

import { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { SavedSearchListResponse, SavedSearchDto } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../src/theme/colors';
import { meSavedSearchesApiClient } from '../../src/services/http';
import {
  SavedSearchListItem,
  SavedSearchListSkeleton,
  SavedSearchListEmpty,
  SavedSearchListError,
  SavedSearchListFooterLoader,
  DeleteConfirmModal,
} from '../../src/components/saved-searches';
import { fromBackendPayload } from '../../src/components/saved-searches/queryPayloadTransform';

const PAGE_SIZE = 20;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SavedSearchesListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<SavedSearchDto | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<SavedSearchListResponse, Error>({
    queryKey: ['savedSearches', 'list'],
    queryFn: ({ pageParam }) =>
      meSavedSearchesApiClient.list({
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

  const items: SavedSearchDto[] =
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

  // ─── Run: navigate to browse with restored filters ─────────────────────────
  const handleRun = useCallback((item: SavedSearchDto) => {
    const filters = fromBackendPayload(item.queryPayload);
    // Navigate to browse; filters are passed via router params (serialised).
    // The browse screen reads the 'savedFilters' param on mount and applies them.
    router.push({
      pathname: '/(tabs)/browse',
      params: { savedFilters: JSON.stringify(filters) },
    } as Parameters<typeof router.push>[0]);
  }, []);

  // ─── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    try {
      await meSavedSearchesApiClient.delete(deleteTarget.id);
      // Invalidate the list so the FlatList refreshes without the deleted row.
      await queryClient.invalidateQueries({ queryKey: ['savedSearches', 'list'] });
      setDeleteTarget(null);
    } catch {
      Alert.alert(t('common.error'), t('common.retry'));
    } finally {
      setDeletePending(false);
    }
  }, [deleteTarget, queryClient, t]);

  const renderItem = useCallback(
    ({ item }: { item: SavedSearchDto }) => (
      <SavedSearchListItem
        item={item}
        onRun={() => handleRun(item)}
        onDelete={() => setDeleteTarget(item)}
      />
    ),
    [handleRun],
  );

  // ─── State branches ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={t('savedSearches.list.title')} />
        <View style={{ paddingTop: 8 }}>
          <SavedSearchListSkeleton rows={4} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={t('savedSearches.list.title')} />
        <SavedSearchListError onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={t('savedSearches.list.title')} />
        <SavedSearchListEmpty />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={t('savedSearches.list.title')} />

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
        ListFooterComponent={isFetchingNextPage ? <SavedSearchListFooterLoader /> : null}
        showsVerticalScrollIndicator={false}
      />

      <DeleteConfirmModal
        visible={deleteTarget !== null}
        pending={deletePending}
        onConfirm={() => void handleDeleteConfirm()}
        onDismiss={() => {
          if (!deletePending) setDeleteTarget(null);
        }}
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
