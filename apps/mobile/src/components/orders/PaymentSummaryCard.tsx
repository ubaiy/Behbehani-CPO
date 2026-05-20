/**
 * PaymentSummaryCard — renders the payments[] array on the detail screen.
 * Each row: method, amount (KWD 3-decimal), status, initiated/paid/failed timestamp.
 *
 * Empty array → no card (suppressed at the parent level).
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PaymentSummaryDto } from '@behbehani-cpo/shared-types';
import { brand, slate, red } from '../../theme/colors';
import { formatKwd } from './orders.utils';

interface Props {
  payments: ReadonlyArray<PaymentSummaryDto>;
}

function statusColor(status: PaymentSummaryDto['status']): string {
  if (status === 'failed') return red[500];
  if (status === 'succeeded') return brand[700];
  return slate[600];
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-KW', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function PaymentSummaryCard({ payments }: Props) {
  const { t } = useTranslation();

  if (payments.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{t('orders.payments.heading')}</Text>
      {payments.map((p, idx) => {
        const ts = p.paidAt ?? p.failedAt ?? p.refundedAt ?? p.initiatedAt;
        return (
          <View
            key={p.id}
            style={[styles.row, idx > 0 && styles.rowDivider]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.method}>
                {t(`orders.payments.method.${p.method}`, { defaultValue: p.method })}
              </Text>
              <Text style={styles.timestamp}>{fmtTime(ts)}</Text>
            </View>
            <View style={styles.rightCol}>
              <Text style={styles.amount}>{formatKwd(p.amountFils)}</Text>
              <Text style={[styles.statusText, { color: statusColor(p.status) }]}>
                {t(`orders.payments.status.${p.status}`, { defaultValue: p.status })}
              </Text>
            </View>
          </View>
        );
      })}
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
  heading: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: slate[900],
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: slate[100],
  },
  method: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: slate[900],
  },
  timestamp: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: slate[500],
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: brand[900],
  },
  statusText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    marginTop: 2,
  },
});
