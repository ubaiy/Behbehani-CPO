/**
 * Notifications list — /notifications
 *
 * Task v0.19.a — authenticated customer notifications inbox, wired to
 * MOBILE_API_CONTRACT.md v1.5.6 §1 backend endpoints.
 *
 * Pattern mirrors apps/mobile/app/orders/index.tsx — 6 visual states:
 *   1. Loading skeleton  (initial fetch)
 *   2. Empty             (no notifications — hint text)
 *   3. Error             (network/server — retry CTA)
 *   4. Paginated list    (FlatList, infinite scroll)
 *   5. Fetching-more     (footer spinner)
 *   6. Refresh           (pull-to-refresh)
 *
 * Sticky header: title + back button + "Mark all read" CTA (if any unread).
 * Each row is NotificationListItem — long-press triggers DeleteConfirmModal.
 *
 * Hard constraints:
 *   • title + body come pre-localized from B — MUST NOT pass through t()
 *   • Touch targets ≥ 44px rows, ≥ 48px CTA
 *   • Red only on delete confirm button (inside DeleteConfirmModal)
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
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NotificationListResponse, NotificationSummaryDto } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../src/theme/colors';
import { meNotificationsApiClient } from '../../src/services/http';
import {
  NotificationListItem,
  NotificationListSkeleton,
  NotificationListEmpty,
  NotificationListError,
  NotificationListFooterLoader,
} from '../../src/components/notifications';

const PAGE_SIZE = 20;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationsListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<NotificationListResponse, Error>({
    queryKey: ['notifications', 'list'],
    queryFn: ({ pageParam }) =>
      meNotificationsApiClient.list({
        page: (pageParam as number | undefined) ?? 1,
        pageSize: PAGE_SIZE,
        unreadOnly: false,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    staleTime: 30_000,
  });

  const items: NotificationSummaryDto[] =
    data?.pages.flatMap((p) => p.items) ?? [];

  const hasUnread = items.some((n) => !n.isRead);

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const markReadMutation = useMutation({
    mutationFn: (id: string) => meNotificationsApiClient.markRead(id),
    onSuccess: (updated) => {
      // Optimistic update: replace item in cached pages.
      queryClient.setQueryData<{ pages: NotificationListResponse[] }>(
        ['notifications', 'list'],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((n) =>
                n.id === updated.id ? updated : n,
              ),
            })),
          };
        },
      );
      // Invalidate the unread count badge.
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => meNotificationsApiClient.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => meNotificationsApiClient.delete(id),
    onSuccess: (_data, id) => {
      // Remove item from cached pages.
      queryClient.setQueryData<{ pages: NotificationListResponse[] }>(
        ['notifications', 'list'],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((n) => n.id !== id),
              total: Math.max(0, page.total - 1),
            })),
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────

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

  const handleMarkRead = useCallback((id: string) => {
    markReadMutation.mutate(id);
  }, [markReadMutation]);

  const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const renderItem = useCallback(
    ({ item }: { item: NotificationSummaryDto }) => (
      <NotificationListItem
        notification={item}
        onMarkRead={handleMarkRead}
        onDelete={handleDelete}
      />
    ),
    [handleMarkRead, handleDelete],
  );

  // ─── State branches ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header
          title={t('notifications.list.title')}
          hasUnread={false}
          onMarkAllRead={handleMarkAllRead}
          markingAll={false}
        />
        <View style={{ paddingTop: 8 }}>
          <NotificationListSkeleton rows={5} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header
          title={t('notifications.list.title')}
          hasUnread={false}
          onMarkAllRead={handleMarkAllRead}
          markingAll={false}
        />
        <NotificationListError onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header
          title={t('notifications.list.title')}
          hasUnread={false}
          onMarkAllRead={handleMarkAllRead}
          markingAll={false}
        />
        <NotificationListEmpty />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title={t('notifications.list.title')}
        hasUnread={hasUnread}
        onMarkAllRead={handleMarkAllRead}
        markingAll={markAllReadMutation.isPending}
      />
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
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
        ListFooterComponent={
          isFetchingNextPage ? <NotificationListFooterLoader /> : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ─── Sticky header ─────────────────────────────────────────────────────────────

interface HeaderProps {
  title: string;
  hasUnread: boolean;
  onMarkAllRead: () => void;
  markingAll: boolean;
}

function Header({ title, hasUnread, onMarkAllRead, markingAll }: HeaderProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {hasUnread && (
        <TouchableOpacity
          style={[styles.markAllBtn, markingAll && styles.markAllBtnDisabled]}
          onPress={onMarkAllRead}
          disabled={markingAll}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.actions.markAllRead')}
        >
          <Text style={styles.markAllBtnText}>
            {t('notifications.actions.markAllRead')}
          </Text>
        </TouchableOpacity>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: slate[200],
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 20,
    color: brand[700],
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: slate[900],
  },
  markAllBtn: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: brand[900],
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markAllBtnDisabled: {
    opacity: 0.5,
  },
  markAllBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
