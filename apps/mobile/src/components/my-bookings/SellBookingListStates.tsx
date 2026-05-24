/**
 * SellBookingListStates — loading / empty / error / footer states
 * for the My Sell-Bookings list (Task v0.22.b).
 *
 * Mirrors InspectionListStates pattern — consistent skeleton blocks,
 * brand-tinted CTA, slate palette. No emerald/amber.
 */

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';

// ─── Skeleton row ─────────────────────────────────────────────────────────────

export function SellBookingListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skHeader}>
            <View style={[styles.skBlock, { width: 36, height: 36, borderRadius: 10 }]} />
            <View style={{ flex: 1, gap: 6, marginLeft: 10 }}>
              <View style={[styles.skBlock, { width: '70%', height: 16 }]} />
              <View style={[styles.skBlock, { width: '45%', height: 12, borderRadius: 9999 }]} />
            </View>
            <View style={[styles.skBlock, { width: 36, height: 12 }]} />
          </View>
          <View style={[styles.skBlock, { width: '55%', height: 12, marginTop: 8 }]} />
        </View>
      ))}
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

interface EmptyProps {
  onBrowseSell: () => void;
}

export function SellBookingListEmpty({ onBrowseSell }: EmptyProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Text style={styles.emptyIcon} accessibilityElementsHidden>
        📋
      </Text>
      <Text style={styles.emptyTitle}>{t('myBookings.empty', 'No bookings yet')}</Text>
      <Text style={styles.emptyBody}>
        {t(
          'myBookings.emptyHint',
          'Book a concierge inspection to sell your car.',
        )}
      </Text>
      <Pressable
        style={styles.browseCta}
        onPress={onBrowseSell}
        accessibilityRole="button"
        accessibilityLabel={t('myBookings.browseCta', 'Book a concierge inspection')}
      >
        <Text style={styles.browseCtaText}>
          {t('myBookings.browseCta', 'Book a concierge inspection')}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

interface ErrorProps {
  onRetry: () => void;
}

export function SellBookingListError({ onRetry }: ErrorProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>{t('myBookings.error', "Couldn't load bookings")}</Text>
      <Text style={styles.emptyBody}>
        {t('myBookings.errorHint', 'Check your connection and try again.')}
      </Text>
      <TouchableOpacity
        style={styles.retryCta}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t('myBookings.retry', 'Retry')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.retryCtaText}>{t('myBookings.retry', 'Retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Footer spinner ───────────────────────────────────────────────────────────

export function SellBookingListFooterLoader() {
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
    alignItems: 'flex-start',
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
  emptyIcon: {
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
    marginBottom: 24,
  },
  browseCta: {
    minHeight: 48,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: brand[900],
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  browseCtaText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
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
