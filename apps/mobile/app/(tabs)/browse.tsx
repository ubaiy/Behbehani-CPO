/**
 * Browse screen — Sprint W2
 *
 * Mirrors mockup: mockups/mobile/sprint-M2/02-browse.html
 *
 * Features:
 * - Sticky header with "Browse cars" title + filter icon
 * - Scrollable filter chip rail (active filters shown as dismissible chips)
 * - Live count header ("N cars match")
 * - Sort dropdown (5 API enum options: featured|priceAsc|priceDesc|mileageAsc|newest)
 * - Grid / List view toggle (persisted via AsyncStorage key cpo.browse.viewMode)
 * - Infinite-scroll FlatList (react-query useInfiniteQuery, pageSize=12, max=48)
 * - Pull-to-refresh
 * - Empty / Loading skeleton / Error states
 * - Reserved overlay on mock reserved card (index 3)
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  I18nManager,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { palette, fontFamily, radius, spacing, shadows } from '../../src/theme/theme';
import { FilterSheet, type BrowseFilters } from '../../src/components/FilterSheet';
import { ListingCard } from '../../src/components/ListingCard';
import type { ListingPublicSummary } from '@behbehani-cpo/shared-types';

import { BrowseHeader } from '../../src/components/browse/BrowseHeader';
import { FilterChipRail } from '../../src/components/browse/FilterChipRail';
import { SortDropdown, SORT_OPTIONS, type SortOption } from '../../src/components/browse/SortDropdown';
import { ViewToggle, VIEW_MODE_KEY, type ViewMode } from '../../src/components/browse/ViewToggle';
import { BrowseEmptyState } from '../../src/components/browse/BrowseEmptyState';
import { BrowseErrorRetry } from '../../src/components/browse/BrowseErrorRetry';
import { SaveCurrentSearchModal } from '../../src/components/saved-searches';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;
const MAX_ITEMS = 48;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKwd(fils: string | number): string {
  const n = typeof fils === 'string' ? parseInt(fils, 10) : fils;
  const kwd = n / 1000;
  return `KWD ${kwd.toLocaleString('en-KW', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}`;
}

// ─── Card rendering ───────────────────────────────────────────────────────────
// Closes follow-up #47: previously a local `ListingCardPlaceholder` re-implemented
// the home rail's card visually. Now we use the canonical `ListingCard` from
// `src/components/ListingCard.tsx` so price-drop strikethrough (#41 / A-1),
// favorite heart, badge logic, and pressed-state styling stay consistent
// between home rails and browse grid/list. `variant='list'` was added to
// `ListingCard` in the W2 home coder pass.

function ReservedCardPlaceholder({ variant }: { variant: ViewMode }) {
  const { t } = useTranslation();
  const isGrid = variant === 'grid';
  return (
    <View style={[isGrid ? cs.cardGrid : cs.cardList, shadows.sm]}>
      <View style={isGrid ? cs.photoGrid : cs.photoList}>
        <View style={[StyleSheet.absoluteFill, cs.photoFallbackBlue]} />
        <View style={cs.reservedOverlay}>
          <View style={cs.reservedBadge}>
            <Text style={cs.reservedBadgeText}>{t('browse.reservedBadge')}</Text>
          </View>
          <Text style={cs.reservedSub}>{t('browse.reservedSub')}</Text>
        </View>
      </View>
      <View style={cs.cardBody}>
        <Text style={cs.cardTitle} numberOfLines={1}>{t('browse.reservedTitle')}</Text>
        {!isGrid && <Text style={cs.cardMeta}>{t('browse.reservedMeta')}</Text>}
        <Text style={[cs.cardPrice, cs.cardPriceReserved]}>KWD 6,850.000</Text>
      </View>
    </View>
  );
}

function CardSkeleton({ variant }: { variant: ViewMode }) {
  const isGrid = variant === 'grid';
  return (
    <View style={isGrid ? cs.cardGrid : cs.cardList}>
      <View style={[isGrid ? cs.photoGrid : cs.photoList, cs.skeletonPhoto]} />
      <View style={cs.cardBody}>
        <View style={cs.skeletonLine} />
        <View style={[cs.skeletonLine, cs.skeletonLineShort]} />
        <View style={[cs.skeletonLine, cs.skeletonLinePrice]} />
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BrowseScreen() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<BrowseFilters>({});
  const [sort, setSort] = useState<SortOption>('featured');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [saveSearchModalVisible, setSaveSearchModalVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(VIEW_MODE_KEY).then(v => {
      if (v === 'grid' || v === 'list') setViewMode(v);
    });
  }, []);

  const apiFilter = useMemo(
    () => ({
      brand: filters.brand,
      body: filters.body,
      budgetMaxFils: filters.budgetMaxKwd !== undefined ? filters.budgetMaxKwd * 1000 : undefined,
      sort,
      pageSize: PAGE_SIZE,
    }),
    [filters, sort]
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['listings', 'list', apiFilter],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const { ListingsPublicApiClient } = await import('@behbehani-cpo/data-access-mobile');
      const { default: axios } = await import('axios');
      const client = new ListingsPublicApiClient(
        axios.create({ baseURL: process.env['EXPO_PUBLIC_API_URL'] ?? '' })
      );
      return client.list({ ...apiFilter, page: pageParam });
    },
    initialPageParam: 1,
    getNextPageParam: last => {
      const loaded = (last.page - 1) * last.pageSize + last.items.length;
      if (loaded >= last.total || loaded >= MAX_ITEMS) return undefined;
      return last.page + 1;
    },
  });

  const allListings = useMemo(() => data?.pages.flatMap(p => p.items) ?? [], [data]);
  const totalCount = data?.pages[0]?.total ?? 0;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleApplyFilters = useCallback((f: BrowseFilters) => {
    setFilters(f);
    setFilterSheetVisible(false);
  }, []);

  const handleResetFilters = useCallback(() => setFilters({}), []);

  const removeFilter = useCallback((key: keyof BrowseFilters) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const activeChips = useMemo(() => {
    const chips: { key: keyof BrowseFilters; label: string }[] = [];
    if (filters.brand) chips.push({ key: 'brand', label: t('common.chipBrand', { value: filters.brand }) });
    if (filters.body) chips.push({ key: 'body', label: t('common.chipBody', { value: filters.body }) });
    if (filters.budgetMaxKwd !== undefined) {
      chips.push({
        key: 'budgetMaxKwd',
        label: t('common.chipBudgetMax', {
          value: filters.budgetMaxKwd.toLocaleString('en-KW', {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          }),
        }),
      });
    }
    return chips;
  }, [filters, t]);

  const activeFilterCount = activeChips.length;
  const currentSortKey = SORT_OPTIONS.find(o => o.value === sort)?.tKey ?? 'sort.featured';
  const currentSortLabel = t(currentSortKey);

  const renderItem = useCallback(
    ({ item, index }: { item: ListingPublicSummary; index: number }) => {
      const content = index === 3
        ? <ReservedCardPlaceholder variant={viewMode} />
        : <ListingCard listing={item} variant={viewMode} showFavorite />;
      return <View style={viewMode === 'grid' ? cs.gridItem : cs.listItem}>{content}</View>;
    },
    [viewMode]
  );

  const keyExtractor = useCallback((item: ListingPublicSummary) => item.id, []);

  const ListFooter = isFetchingNextPage ? (
    <View style={cs.footerRow}>
      <ActivityIndicator size="small" color={palette.royalBlue700} />
      <Text style={cs.footerText}>{t('browse.loadingMore')}</Text>
    </View>
  ) : null;

  const showSkeleton = isLoading && allListings.length === 0;
  const showEmpty = !isLoading && !isError && allListings.length === 0;

  if (isError) {
    return (
      <SafeAreaView style={cs.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={palette.white} />
        <BrowseHeader filterCount={activeFilterCount} onFilterPress={() => setFilterSheetVisible(true)} />
        <BrowseErrorRetry onRetry={() => refetch()} />
        <FilterSheet
          visible={filterSheetVisible}
          initialFilters={filters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onClose={() => setFilterSheetVisible(false)}
          matchCount={totalCount}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={cs.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.white} />

      <BrowseHeader filterCount={activeFilterCount} onFilterPress={() => setFilterSheetVisible(true)} />

      <FilterChipRail
        activeChips={activeChips}
        activeFilterCount={activeFilterCount}
        onFiltersPress={() => setFilterSheetVisible(true)}
        onRemoveChip={removeFilter}
      />

      {/* Count + sort/view controls */}
      <View style={cs.countRow}>
        <Text style={cs.countText}>
          {isLoading ? t('browse.carsMatchLoading') : t('browse.carsMatch', { count: totalCount })}
        </Text>
        <View style={cs.sortViewRow}>
          {activeFilterCount > 0 ? (
            <TouchableOpacity
              style={cs.saveSearchBtn}
              onPress={() => setSaveSearchModalVisible(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('savedSearches.save.cta')}
            >
              <Text style={cs.saveSearchBtnText}>{t('savedSearches.save.cta')}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={cs.sortBtn} onPress={() => setSortModalVisible(true)} activeOpacity={0.8}>
            <Text style={cs.sortBtnText} numberOfLines={1}>{currentSortLabel}</Text>
            <Text style={cs.sortChevron}>{'▾'}</Text>
          </TouchableOpacity>
          <ViewToggle viewMode={viewMode} onChangeViewMode={setViewMode} />
        </View>
      </View>

      {showSkeleton ? (
        <ScrollView style={{ flex: 1, backgroundColor: palette.gray50 }} contentContainerStyle={cs.skeletonWrap}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={viewMode === 'grid' ? cs.gridItem : cs.listItem}>
              <CardSkeleton variant={viewMode} />
            </View>
          ))}
        </ScrollView>
      ) : showEmpty ? (
        <BrowseEmptyState onReset={handleResetFilters} />
      ) : (
        <FlatList
          data={allListings}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={[cs.listContent, viewMode === 'grid' && cs.listContentGrid]}
          columnWrapperStyle={viewMode === 'grid' ? cs.gridRow : undefined}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={ListFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isLoading}
              onRefresh={() => refetch()}
              tintColor={palette.royalBlue700}
              colors={[palette.royalBlue700]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <SortDropdown
        visible={sortModalVisible}
        currentSort={sort}
        onSelect={v => { setSort(v); setSortModalVisible(false); }}
        onClose={() => setSortModalVisible(false)}
      />

      <FilterSheet
        visible={filterSheetVisible}
        initialFilters={filters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        onClose={() => setFilterSheetVisible(false)}
        matchCount={totalCount}
      />

      <SaveCurrentSearchModal
        visible={saveSearchModalVisible}
        currentFilters={filters}
        onSuccess={() => {
          setSaveSearchModalVisible(false);
          Alert.alert(t('savedSearches.save.successToast'));
        }}
        onDismiss={() => setSaveSearchModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cs = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.white },

  // Count row
  countRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: palette.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray100,
    gap: spacing[2],
  },
  countText: { fontSize: 14, fontFamily: fontFamily.bold, color: palette.gray900 },
  sortViewRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  saveSearchBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.royalBlue700,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  saveSearchBtnText: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
    color: palette.royalBlue700,
  },
  sortBtn: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.white,
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    maxWidth: 160,
  },
  sortBtnText: { fontSize: 12, fontFamily: fontFamily.semiBold, color: palette.gray700, flex: 1 },
  sortChevron: { fontSize: 10, color: palette.gray400 },

  // List / grid layout
  listContent: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    paddingBottom: spacing[6],
    backgroundColor: palette.gray50,
  },
  listContentGrid: { paddingHorizontal: spacing[2] },
  listItem: { marginBottom: spacing[3] },
  gridRow: { gap: spacing[2] },
  gridItem: { flex: 1, marginBottom: spacing[2] },

  // Cards
  cardList: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.white,
    overflow: 'hidden',
  },
  cardGrid: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.white,
    overflow: 'hidden',
  },
  photoList: { aspectRatio: 16 / 10, position: 'relative', overflow: 'hidden' },
  photoGrid: { aspectRatio: 4 / 3, position: 'relative', overflow: 'hidden' },
  photoFallback: { backgroundColor: palette.royalBlue100 },
  photoFallbackBlue: { backgroundColor: palette.royalBlue200 },
  inspectedBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  inspectedText: { fontSize: 10, fontFamily: fontFamily.bold, color: palette.royalBlue800 },
  favBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  favIcon: { fontSize: 16, color: palette.gray500 },
  reservedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  reservedBadge: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center', backgroundColor: palette.white,
    borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6, gap: 6,
  },
  reservedBadgeText: { fontSize: 12, fontFamily: fontFamily.bold, color: palette.gray900 },
  reservedSub: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontFamily: fontFamily.regular },
  cardBody: { padding: spacing[3], gap: 4 },
  cardTitle: { fontSize: 15, fontFamily: fontFamily.bold, color: palette.gray900, lineHeight: 20 },
  cardMeta: { fontSize: 12, color: palette.gray500, fontFamily: fontFamily.regular },
  cardPrice: { fontSize: 16, fontFamily: fontFamily.bold, color: palette.royalBlue900 },
  cardPriceReserved: { color: palette.gray400, textDecorationLine: 'line-through' },
  cardMonthly: { fontSize: 10, color: palette.gray500, fontFamily: fontFamily.regular },

  // Skeleton
  skeletonWrap: {
    paddingHorizontal: spacing[3], paddingTop: spacing[2],
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2],
  },
  skeletonPhoto: { backgroundColor: palette.gray200 },
  skeletonLine: { height: 14, backgroundColor: palette.gray200, borderRadius: radius.sm, width: '66%' },
  skeletonLineShort: { width: '50%', height: 12, backgroundColor: palette.gray100 },
  skeletonLinePrice: { width: '33%', height: 16, backgroundColor: palette.gray200, alignSelf: 'flex-end' },

  // Footer
  footerRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'center', alignItems: 'center',
    gap: spacing[2], paddingVertical: spacing[4],
  },
  footerText: { fontSize: 12, color: palette.gray500, fontFamily: fontFamily.regular },
});
