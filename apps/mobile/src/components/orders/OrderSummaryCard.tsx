/**
 * OrderSummaryCard — top card on the detail screen.
 * Renders the stock number, current status pill, total + reservation amounts,
 * and reservation timestamps.
 *
 * Vehicle photo + title are NOT in the order DTO — they're loaded separately
 * by VehicleCard.tsx using the listingId.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { OrderDetailDto } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';
import { StatusPill } from './StatusPill';
import { formatKwd, formatDate, hasFailedPayment } from './orders.utils';

interface Props {
  order: OrderDetailDto;
}

export function OrderSummaryCard({ order }: Props) {
  const { t } = useTranslation();
  const failed = hasFailedPayment(order.payments);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.stockBlock}>
          <Text style={styles.eyebrow}>{t('orders.summary.stockEyebrow')}</Text>
          <Text style={styles.stockText}>{order.stockNumber}</Text>
        </View>
        <StatusPill status={order.status} failed={failed} />
      </View>

      <View style={styles.divider} />

      <View style={styles.amountRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.amountLabel}>{t('orders.summary.total')}</Text>
          <Text style={styles.amountValue}>{formatKwd(order.totalAmountFils)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.amountLabel}>{t('orders.summary.paid')}</Text>
          <Text style={styles.amountValue}>{formatKwd(order.paidAmountFils)}</Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.amountLabel}>{t('orders.summary.reservationFee')}</Text>
          <Text style={styles.amountValueMuted}>
            {formatKwd(order.reservationAmountFils)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.amountLabel}>{t('orders.summary.reservedAt')}</Text>
          <Text style={styles.amountValueMuted}>{formatDate(order.reservedAt)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockBlock: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: slate[500],
    letterSpacing: 1,
  },
  stockText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: slate[900],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: slate[100],
    marginVertical: 14,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  amountLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: slate[500],
    marginBottom: 4,
  },
  amountValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: brand[900],
  },
  amountValueMuted: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: slate[700],
  },
});
