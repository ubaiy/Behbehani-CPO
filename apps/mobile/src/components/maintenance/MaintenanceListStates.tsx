/**
 * Empty / loading / error / footer states for the maintenance list.
 *
 * Mirrors InspectionListStates pattern — solid neutral skeleton blocks,
 * brand-tinted CTA, slate palette.
 */

import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';

// ─── Skeleton row ─────────────────────────────────────────────────────────────

export function MaintenanceListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skHeader}>
            <View style={[styles.skBlock, { width: 90, height: 12 }]} />
            <View style={[styles.skBlock, { width: 80, height: 18, borderRadius: 9999 }]} />
          </View>
          <View style={[styles.skBlock, { width: '70%', height: 18, marginTop: 10 }]} />
          <View style={[styles.skBlock, { width: '50%', height: 13, marginTop: 8 }]} />
          <View style={styles.skFooter}>
            <View style={[styles.skBlock, { width: 90, height: 13 }]} />
            <View style={[styles.skBlock, { width: 70, height: 13 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function MaintenanceListEmpty() {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Text style={styles.emptyEmoji} accessibilityElementsHidden>
        {'⚒️'}
      </Text>
      <Text style={styles.emptyTitle}>{t('maintenance.list.empty')}</Text>
      <Text style={styles.emptyBody}>{t('maintenance.list.emptyHint')}</Text>
    </View>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

export function MaintenanceListError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>{t('maintenance.list.error')}</Text>
      <TouchableOpacity
        style={styles.retryCta}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t('maintenance.list.retry')}
      >
        <Text style={styles.retryCtaText}>{t('maintenance.list.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Footer spinner for paginated fetch-more ──────────────────────────────────

export function MaintenanceListFooterLoader() {
  return (
    <View style={styles.footerLoader}>
      <ActivityIndicator color={brand[700]} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  skBlock: {
    backgroundColor: slate[100],
    borderRadius: 4,
  },
  skFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
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
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
