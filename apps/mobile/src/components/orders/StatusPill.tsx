/**
 * StatusPill — small inline pill rendering order status with brand-correct
 * background + foreground tokens (orders.utils.getStatusPillStyle).
 *
 * Red-500 variant is reserved for hard payment failure (FAILED_PILL).
 * Labels are resolved through i18n (orders.statusPill.*).
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { OrderStatusValue } from '@behbehani-cpo/shared-types';
import { getStatusPillStyle, FAILED_PILL } from './orders.utils';

interface Props {
  status: OrderStatusValue;
  /** When true, override the status colour and show the red "Payment failed" pill. */
  failed?: boolean;
}

export function StatusPill({ status, failed = false }: Props) {
  const { t } = useTranslation();
  const style = failed ? FAILED_PILL : getStatusPillStyle(status);

  const label = failed
    ? t('orders.statusPill.failed')
    : t(`orders.statusPill.${status}`);

  return (
    <View
      style={[styles.pill, { backgroundColor: style.bg }]}
      accessibilityRole="text"
      accessibilityLabel={t('orders.statusPill.a11y', { label })}
    >
      <Text style={[styles.label, { color: style.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
