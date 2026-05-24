/**
 * SellBookingListItem — single row card in the My Sell-Bookings list.
 *
 * Structure:
 *   [car icon] [vehicle title] [bookingRef chip] [status pill] [relative date]
 *   [scheduled date row]
 *   [latest offer banner — if present]
 *
 * Touch target: entire row, minHeight ≥ 88 px.
 * Tapping navigates to /sell/concierge/tracker/[bookingRef].
 */

import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CustomerInspectionView } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';
import { formatDate, formatKwd } from '../orders/orders.utils';
import { SellBookingStatusPill } from './SellBookingStatusPill';

interface Props {
  booking: CustomerInspectionView;
  onPress: () => void;
}

/** Relative date — "2 days ago" style. */
function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export function SellBookingListItem({ booking, onPress }: Props) {
  const { t } = useTranslation();
  const { vehicle, bookingRef, status, scheduledFor, latestOffer, createdAt } = booking;

  const vehicleTitle =
    [vehicle.year, vehicle.brand, vehicle.model].filter(Boolean).join(' ') ||
    t('myBookings.vehicleUnknown', 'Vehicle details pending');

  const isActiveOffer =
    latestOffer !== null &&
    latestOffer !== undefined &&
    !['accepted', 'declined', 'expired', 'withdrawn'].includes(latestOffer.status);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t('myBookings.itemA11y', {
        ref: bookingRef,
        vehicle: vehicleTitle,
      })}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      {/* Row 1 — icon + vehicle title + relative date */}
      <View style={styles.topRow}>
        <View style={styles.vehicleIcon} accessibilityElementsHidden>
          <Text style={styles.vehicleIconText}>🚗</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.vehicleTitle} numberOfLines={1}>
            {vehicleTitle}
          </Text>
          {/* booking ref chip */}
          <View style={styles.chipRow}>
            <View style={styles.refChip}>
              <Text style={styles.refChipText}>#{bookingRef}</Text>
            </View>
            <SellBookingStatusPill status={status} />
          </View>
        </View>
        <Text style={styles.relDate}>{relativeDate(createdAt)}</Text>
      </View>

      {/* Row 2 — scheduled date */}
      {scheduledFor ? (
        <Text style={styles.scheduledDate}>
          {t('myBookings.scheduledLabel', 'Scheduled')} · {formatDate(scheduledFor)}
        </Text>
      ) : null}

      {/* Row 3 — active offer banner */}
      {isActiveOffer && latestOffer ? (
        <View style={styles.offerBanner}>
          <Text style={styles.offerText}>
            {t('myBookings.offerActive', {
              amount: formatKwd(latestOffer.amountFils as string | number),
            })}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 88,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  vehicleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vehicleIconText: {
    fontSize: 18,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  vehicleTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: slate[900],
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  refChip: {
    backgroundColor: slate[100],
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: slate[200],
  },
  refChipText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: slate[700],
    letterSpacing: 0.3,
  },
  relDate: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: slate[400],
    flexShrink: 0,
    marginTop: 2,
  },
  scheduledDate: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: slate[500],
  },
  offerBanner: {
    backgroundColor: brand[50],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: brand[100],
  },
  offerText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: brand[800],
  },
});
