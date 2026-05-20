/**
 * OrderListItem — single row in the orders list (Task #65).
 *
 * Mirrors the structure of A's web /account/orders item:
 *   [order ref · status pill]
 *   [stock number / vehicle title]
 *   [KWD 3-decimal total]      [reserved date]
 *
 * Touch target ≥ 48px height (entire row is the press target).
 */

import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { OrderSummaryDto } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';
import { StatusPill } from './StatusPill';
import { formatKwd, formatDate } from './orders.utils';

interface Props {
  order: OrderSummaryDto;
  onPress: () => void;
}

export function OrderListItem({ order, onPress }: Props) {
  const { t } = useTranslation();

  // Order ref display — use last-8 of UUID as a short readable ref.
  // (Server-provided stockNumber is the vehicle stock, not the order ref —
  // we surface both so the customer recognises the car.)
  const shortRef = `#${order.id.slice(-8).toUpperCase()}`;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${t('orders.list.itemA11y', { ref: shortRef, stock: order.stockNumber })}`}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <View style={styles.headerRow}>
        <Text style={styles.refText}>{shortRef}</Text>
        <StatusPill status={order.status} />
      </View>

      <Text style={styles.stockText} numberOfLines={1}>
        {t('orders.vehicle.stockNumber', { value: order.stockNumber })}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.amountText}>{formatKwd(order.totalAmountFils)}</Text>
        <Text style={styles.dateText}>{formatDate(order.reservedAt)}</Text>
      </View>
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
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  refText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: brand[700],
    letterSpacing: 0.4,
  },
  stockText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: slate[900],
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  amountText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: brand[900],
  },
  dateText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: slate[500],
  },
});
