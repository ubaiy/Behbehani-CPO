/**
 * Empty / loading / error states for the orders list (Task #65).
 *
 * Mirrors A's 6-state web list pattern: loading skeleton, empty, error,
 * paginated list (rendered by the parent FlatList), fetching-more (footer),
 * refresh (RefreshControl).
 *
 * Skeleton uses brand-50 / slate-100 shimmer placeholder (no animated lib —
 * solid neutral block; the skeleton communicates "loading" without motion).
 */

import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';

// ─── Skeleton row ─────────────────────────────────────────────────────────────

export function OrderListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={[styles.skBlock, { width: 90, height: 12 }]} />
          <View style={[styles.skBlock, { width: '70%', height: 18, marginTop: 10 }]} />
          <View style={styles.skFooter}>
            <View style={[styles.skBlock, { width: 100, height: 14 }]} />
            <View style={[styles.skBlock, { width: 80, height: 12 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function OrderListEmpty({ onBrowse }: { onBrowse: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Text style={styles.emptyEmoji} accessibilityElementsHidden>📦</Text>
      <Text style={styles.emptyTitle}>{t('orders.list.empty')}</Text>
      <Text style={styles.emptyBody}>{t('orders.list.emptyBody')}</Text>
      <TouchableOpacity
        style={styles.emptyCta}
        onPress={onBrowse}
        accessibilityRole="button"
        accessibilityLabel={t('orders.list.browseCars')}
      >
        <Text style={styles.emptyCtaText}>{t('orders.list.browseCars')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

export function OrderListError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>{t('orders.list.error')}</Text>
      <Text style={styles.emptyBody}>{t('orders.list.errorBody')}</Text>
      <TouchableOpacity
        style={styles.emptyCta}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t('orders.list.retry')}
      >
        <Text style={styles.emptyCtaText}>{t('orders.list.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Footer spinner for paginated fetch-more ──────────────────────────────────

export function OrderListFooterLoader() {
  return (
    <View style={styles.footerLoader}>
      <ActivityIndicator color={brand[700]} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Skeleton
  skeletonRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  skBlock: {
    backgroundColor: slate[100],
    borderRadius: 4,
  },
  skFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },

  // Empty / error
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: slate[900],
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: slate[600],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyCta: {
    minHeight: 48,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: brand[900],
    borderRadius: 9999,
    justifyContent: 'center',
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
  },

  // Footer
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
