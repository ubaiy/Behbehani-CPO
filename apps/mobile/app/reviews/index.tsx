/**
 * My Reviews list — /reviews
 *
 * Task v0.19.c — customer-facing reviews surface, reached from the account hub
 * Reviews tile (Engagement group).
 *
 * 6 visual states:
 *   1. Loading skeleton  (initial fetch)
 *   2. Empty             (no reviews yet)
 *   3. Error             (network/server — retry CTA)
 *   4. Paginated list    (FlatList, infinite scroll)
 *   5. Fetching-more     (footer spinner)
 *   6. Refresh           (pull-to-refresh)
 *
 * Each row: ReviewListItem (showTarget=true — shows kind icon + label)
 *           with Delete action wired to DeleteConfirmModal.
 *
 * Mirrors orders/index pattern.
 */

import { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ReviewDto, ReviewListResponse } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../src/theme/colors';
import { meReviewsApiClient } from '../../src/services/http';
import {
  ReviewListItem,
  ReviewListSkeleton,
  ReviewListEmpty,
  ReviewListError,
  ReviewListFooterLoader,
  DeleteConfirmModal,
} from '../../src/components/reviews';

const PAGE_SIZE = 20;

export default function ReviewsListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReviewDto | null>(null);

  // ─── Infinite query ──────────────────────────────────────────────────────────

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<ReviewListResponse, Error>({
    queryKey: ['reviews', 'me'],
    queryFn: ({ pageParam }) =>
      meReviewsApiClient.list({
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

  const items: ReviewDto[] = data?.pages.flatMap((p) => p.items) ?? [];

  // ─── Delete mutation ─────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: string) => meReviewsApiClient.delete(id),
    onSuccess: () => {
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['reviews', 'me'] });
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────

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
    ({ item }: { item: ReviewDto }) => (
      <ReviewListItem
        review={item}
        showTarget
        onDelete={() => setDeleteTarget(item)}
      />
    ),
    [],
  );

  // ─── State branches ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={t('reviews.list.title')} />
        <View style={{ paddingTop: 8 }}>
          <ReviewListSkeleton rows={4} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={t('reviews.list.title')} />
        <ReviewListError onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={t('reviews.list.title')} />
        <ReviewListEmpty />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={t('reviews.list.title')} />

      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
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
        ListFooterComponent={isFetchingNextPage ? <ReviewListFooterLoader /> : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        visible={deleteTarget !== null}
        pending={deleteMutation.status === 'pending'}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
          }
        }}
        onDismiss={() => {
          if (deleteMutation.status !== 'pending') setDeleteTarget(null);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
