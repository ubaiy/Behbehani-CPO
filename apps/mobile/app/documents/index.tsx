/**
 * Documents list — /documents
 *
 * Task v0.17 — customer document vault, reached from the account hub
 * "Documents" tile (account.tsx now routes here).
 *
 * Wired to the real GET /v1/public/me/documents endpoint via
 * meDocumentsApiClient (authenticated, 401-refresh handled).
 * On tap: fetches a fresh signed S3 URL from the detail endpoint, then
 * opens it in expo-web-browser (in-app browser tab — auto-dismisses on close).
 *
 * Six visual states (mirrors inspections/index.tsx pattern):
 *   1. Loading skeleton  (initial fetch)
 *   2. Empty             (no documents yet)
 *   3. Error             (network/server — retry CTA)
 *   4. Paginated list    (FlatList, infinite scroll)
 *   5. Fetching-more     (footer spinner)
 *   6. Refresh           (pull-to-refresh)
 *
 * Hard constraints (Task v0.17):
 *   • Touch target ≥ 48px on each row + CTA
 *   • White + brand + slate palette only
 *   • All user-visible strings via t()
 *   • expo-web-browser for signed S3 URLs — NOT router.push
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
import * as WebBrowser from 'expo-web-browser';
import type { DocumentListResponseDto, DocumentSummaryDto } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../src/theme/colors';
import { meDocumentsApiClient } from '../../src/services/http';
import {
  DocumentListItem,
  DocumentListSkeleton,
  DocumentListEmpty,
  DocumentListError,
  DocumentListFooterLoader,
} from '../../src/components/documents/list';

const PAGE_SIZE = 20;

export default function DocumentsListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  /** Tracks which document id is currently opening (detail fetch in-flight). */
  const [openingId, setOpeningId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<DocumentListResponseDto, Error>({
    queryKey: ['documents', 'list'],
    queryFn: ({ pageParam }) =>
      meDocumentsApiClient.list({
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

  // Flatten the pages into a single array for FlatList.
  const items: DocumentSummaryDto[] =
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

  /**
   * Tap handler — fetches a fresh 15-min signed S3 URL from the detail endpoint,
   * then opens it in the in-app browser via expo-web-browser.
   * Uses openBrowserAsync (not router.push) because the URL is an external S3 URL.
   */
  const handleOpen = useCallback((id: string) => {
    if (openingId !== null) return; // guard: one open at a time
    setOpeningId(id);
    meDocumentsApiClient
      .getDownloadUrl(id)
      .then((detail) => {
        void WebBrowser.openBrowserAsync(detail.downloadUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
        });
      })
      .catch(() => {
        // Silent fail — the user can tap again.
      })
      .finally(() => {
        setOpeningId(null);
      });
  }, [openingId]);

  const renderItem = useCallback(
    ({ item }: { item: DocumentSummaryDto }) => (
      <DocumentListItem
        document={item}
        onPress={() => handleOpen(item.id)}
        isOpening={openingId === item.id}
      />
    ),
    [handleOpen, openingId],
  );

  // ─── State branches ─────────────────────────────────────────────────────────

  // 1. Loading
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={t('documents.list.title')} />
        <View style={{ paddingTop: 8 }}>
          <DocumentListSkeleton rows={4} />
        </View>
      </SafeAreaView>
    );
  }

  // 3. Error
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={t('documents.list.title')} />
        <DocumentListError onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  // 2. Empty
  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={t('documents.list.title')} />
        <DocumentListEmpty />
      </SafeAreaView>
    );
  }

  // 4–6. List + paginated + refresh
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={t('documents.list.title')} />
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
        ListFooterComponent={isFetchingNextPage ? <DocumentListFooterLoader /> : null}
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
