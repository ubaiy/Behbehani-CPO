/**
 * Empty / loading / error states for the notifications list (Task v0.19.a).
 *
 * Mirrors OrderListStates / InspectionListStates pattern: 3 shared state views
 * (skeleton rows, empty, error+retry) + footer spinner for infinite scroll.
 */

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';

// ─── Skeleton row ─────────────────────────────────────────────────────────────

export function NotificationListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skHeader}>
            <View style={[styles.skBlock, { width: 64, height: 12 }]} />
            <View style={[styles.skBlock, { width: 72, height: 20 }]} />
          </View>
          <View style={[styles.skBlock, { width: '85%', height: 16, marginTop: 8 }]} />
          <View style={[styles.skBlock, { width: '60%', height: 13, marginTop: 6 }]} />
          <View style={[styles.skBlock, { width: 80, height: 11, marginTop: 10 }]} />
        </View>
      ))}
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function NotificationListEmpty() {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Text style={styles.emptyEmoji} accessibilityElementsHidden>
        🔔
      </Text>
      <Text style={styles.emptyTitle}>{t('notifications.list.empty')}</Text>
      <Text style={styles.emptyBody}>{t('notifications.list.emptyHint')}</Text>
    </View>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

export function NotificationListError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>{t('notifications.list.error')}</Text>
      <TouchableOpacity
        style={styles.retryCta}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t('notifications.list.retry')}
      >
        <Text style={styles.retryCtaText}>{t('notifications.list.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Footer spinner for paginated fetch-more ──────────────────────────────────

export function NotificationListFooterLoader() {
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
    marginBottom: 10,
  },
  skHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skBlock: {
    backgroundColor: slate[100],
    borderRadius: 4,
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
  },
  retryCta: {
    minHeight: 48,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: brand[900],
    borderRadius: 9999,
    justifyContent: 'center',
    marginTop: 16,
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
