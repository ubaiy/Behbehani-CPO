/**
 * Empty / loading / error / footer states for the saved-searches list.
 *
 * Mirrors InspectionListStates pattern — solid neutral skeleton blocks,
 * brand-tinted CTA, slate palette.
 */

import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';

// ─── Skeleton row ─────────────────────────────────────────────────────────────

export function SavedSearchListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={[styles.skBlock, { width: '60%', height: 18 }]} />
          <View style={[styles.skBlock, { width: '85%', height: 13, marginTop: 8 }]} />
          <View style={styles.skActions}>
            <View style={[styles.skBlock, { flex: 1, height: 40, borderRadius: 9999 }]} />
            <View style={[styles.skBlock, { flex: 1, height: 40, borderRadius: 9999 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function SavedSearchListEmpty() {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Text style={styles.emptyEmoji} accessibilityElementsHidden>🔍</Text>
      <Text style={styles.emptyTitle}>{t('savedSearches.list.empty')}</Text>
      <Text style={styles.emptyBody}>{t('savedSearches.list.emptyHint')}</Text>
    </View>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

export function SavedSearchListError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>{t('savedSearches.list.error')}</Text>
      <TouchableOpacity
        style={styles.retryCta}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t('savedSearches.list.retry')}
      >
        <Text style={styles.retryCtaText}>{t('savedSearches.list.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Footer spinner for paginated fetch-more ──────────────────────────────────

export function SavedSearchListFooterLoader() {
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
    gap: 6,
  },
  skBlock: {
    backgroundColor: slate[100],
    borderRadius: 4,
  },
  skActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
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
  retryCta: {
    minHeight: 48,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: brand[900],
    borderRadius: 9999,
    justifyContent: 'center',
  },
  retryCtaText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
  },

  // Footer loader
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
