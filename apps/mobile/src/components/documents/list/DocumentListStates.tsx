/**
 * Empty / loading / error / footer states for the documents list (Task v0.17).
 *
 * Mirrors InspectionListStates pattern — solid neutral skeleton blocks,
 * brand-tinted CTA, slate palette.
 */

import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../../theme/colors';

// ─── Skeleton row ─────────────────────────────────────────────────────────────

export function DocumentListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skHeader}>
            <View style={[styles.skBlock, { width: 32, height: 32, borderRadius: 6 }]} />
            <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
              <View style={[styles.skBlock, { width: '70%', height: 14 }]} />
              <View style={[styles.skBlock, { width: '45%', height: 12 }]} />
            </View>
            <View style={[styles.skBlock, { width: 60, height: 20, borderRadius: 9999 }]} />
          </View>
          <View style={styles.skFooter}>
            <View style={[styles.skBlock, { width: 110, height: 12 }]} />
            <View style={[styles.skBlock, { width: 70, height: 12 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function DocumentListEmpty() {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Text style={styles.emptyGlyph} accessibilityElementsHidden>
        {'📄'}
      </Text>
      <Text style={styles.emptyTitle}>{t('documents.list.empty')}</Text>
      <Text style={styles.emptyBody}>{t('documents.list.emptyHint')}</Text>
    </View>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

export function DocumentListError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>{t('documents.list.error')}</Text>
      <Text style={styles.emptyBody}>{t('documents.list.errorHint')}</Text>
      <TouchableOpacity
        style={styles.retryCta}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t('documents.list.retry')}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Text style={styles.retryCtaText}>{t('documents.list.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Footer spinner for paginated fetch-more ──────────────────────────────────

export function DocumentListFooterLoader() {
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
  skHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  emptyGlyph: {
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
