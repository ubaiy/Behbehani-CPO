/**
 * Favorites (saved listings) screen — /favorites
 *
 * Task v0.18.b — wired to GET /v1/public/me/saved-listings (paginated)
 * and DELETE /v1/public/me/saved-listings/:listingId.
 *
 * States:
 *   1. Loading skeleton
 *   2. Empty — "Browse cars" CTA → /(tabs)/browse
 *   3. Error + retry
 *   4. Paginated grid of listing cards (variant='list' for clarity)
 *
 * Each card: title, price, photo + filled heart icon + long-press/row-action
 * to remove (optimistic update).
 *
 * Palette: white + brand + slate. Red ONLY for destructive remove.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { SavedListingSummary, SavedListingListResponse } from '@behbehani-cpo/shared-types';
import { brand, slate, red } from '../../src/theme/colors';
import { meSavedListingsApiClient } from '../../src/services/http';
import { formatKwd } from '../../src/components/orders/orders.utils';

const PAGE_SIZE = 20;

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonPhoto} />
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '60%' }]} />
      </View>
    </View>
  );
}

function LoadingSkeleton() {
  return (
    <View style={styles.skeletonList}>
      {[1, 2, 3, 4].map((k) => (
        <SkeletonCard key={k} />
      ))}
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>{t('favorites.emptyTitle')}</Text>
      <Text style={styles.emptyHint}>{t('favorites.emptyHint')}</Text>
      <TouchableOpacity
        style={styles.browseBtn}
        onPress={() => router.push('/(tabs)/browse')}
        accessibilityRole="button"
        accessibilityLabel={t('favorites.browseCta')}
      >
        <Text style={styles.browseBtnText}>{t('favorites.browseCta')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Favorites card ───────────────────────────────────────────────────────────

function FavoriteCard({
  item,
  onRemove,
}: {
  item: SavedListingSummary;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  const priceDisplay = formatKwd(
    typeof item.priceFils === 'bigint'
      ? item.priceFils.toString()
      : String(item.priceFils),
  );

  return (
    <View style={styles.card}>
      {/* Photo */}
      <View style={styles.cardPhoto}>
        {item.heroPhotoUrl ? (
          <Image
            source={{ uri: item.heroPhotoUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.cardPhotoPlaceholder} />
        )}
        {/* Filled heart — in top-right of photo */}
        <View style={styles.heartWrapper}>
          <Text style={styles.heartFilled}>{'♥'}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.titleEn}
        </Text>
        <Text style={styles.cardPrice}>{priceDisplay}</Text>
        <Text style={styles.cardStock}>
          {t('favorites.stockLabel')} {item.stockNumber}
        </Text>
      </View>

      {/* Remove CTA */}
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => onRemove(item.listingId)}
        accessibilityRole="button"
        accessibilityLabel={t('favorites.removeBtn')}
      >
        <Text style={styles.removeBtnText}>{t('favorites.removeBtn')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<SavedListingListResponse, Error>({
    queryKey: ['me', 'saved-listings'],
    queryFn: ({ pageParam }) =>
      meSavedListingsApiClient.list({
        page: typeof pageParam === 'number' ? pageParam : 1,
        pageSize: PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const loaded = (last.page - 1) * last.pageSize + last.items.length;
      return loaded < last.total ? last.page + 1 : undefined;
    },
    staleTime: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: (listingId: string) => meSavedListingsApiClient.remove(listingId),
    onMutate: async (listingId) => {
      // Optimistic: cancel in-flight queries, snapshot, remove from cache.
      await queryClient.cancelQueries({ queryKey: ['me', 'saved-listings'] });
      const prev = queryClient.getQueryData(['me', 'saved-listings']);
      queryClient.setQueryData<{ pages: SavedListingListResponse[] }>(
        ['me', 'saved-listings'],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((i) => i.listingId !== listingId),
              total: Math.max(0, page.total - 1),
            })),
          };
        },
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      queryClient.setQueryData(['me', 'saved-listings'], ctx?.prev);
      Alert.alert(t('favorites.removeError'), t('favorites.removeErrorHint'));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['me', 'saved-listings'] });
    },
  });

  const handleRemove = useCallback(
    (listingId: string) => {
      Alert.alert(t('favorites.removeConfirmTitle'), t('favorites.removeConfirmBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('favorites.removeBtn'),
          style: 'destructive',
          onPress: () => removeMutation.mutate(listingId),
        },
      ]);
    },
    [removeMutation, t],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

  // ─── Loading ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader />
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('favorites.error')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>{t('favorites.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader />
      {allItems.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item) => item.listingId}
          renderItem={({ item }) => (
            <FavoriteCard item={item} onRemove={handleRemove} />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 24 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={brand[700]} />
              </View>
            ) : null
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── ScreenHeader ─────────────────────────────────────────────────────────────

function ScreenHeader() {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
        accessibilityLabel={t('common.cancel')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backBtnText}>{'‹'}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('favorites.title')}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: slate[100],
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 26,
    color: brand[700],
    lineHeight: 30,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: slate[900],
  },
  headerSpacer: {
    minWidth: 44,
  },
  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  separator: {
    height: 12,
  },
  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[100],
    overflow: 'hidden',
  },
  cardPhoto: {
    height: 180,
    backgroundColor: slate[100],
    position: 'relative',
  },
  cardPhotoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: slate[100],
  },
  heartWrapper: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartFilled: {
    fontSize: 18,
    color: red[500],
  },
  cardBody: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: slate[900],
    marginBottom: 4,
    lineHeight: 22,
  },
  cardPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: brand[900],
    marginBottom: 4,
  },
  cardStock: {
    fontSize: 12,
    color: slate[500],
  },
  removeBtn: {
    marginHorizontal: 14,
    marginBottom: 14,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: red[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: red[500],
  },
  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: slate[800],
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 15,
    color: slate[500],
    textAlign: 'center',
    lineHeight: 22,
  },
  browseBtn: {
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 28,
    backgroundColor: brand[700],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Error
  errorText: {
    fontSize: 16,
    color: slate[600],
    textAlign: 'center',
  },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: 24,
    backgroundColor: brand[700],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Skeleton
  skeletonList: {
    padding: 16,
    gap: 12,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[100],
    overflow: 'hidden',
  },
  skeletonPhoto: {
    height: 180,
    backgroundColor: slate[100],
  },
  skeletonBody: {
    padding: 14,
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: slate[100],
    borderRadius: 4,
    width: '80%',
  },
  // Footer loader
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
