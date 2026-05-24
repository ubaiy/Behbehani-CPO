/**
 * SellBookingStatusPill — inline pill for sell-concierge booking status.
 *
 * Maps InspectionStatus enum values to brand-correct bg/fg tokens.
 * Brand-only + slate palette; NO amber/green/emerald per v1.5-D1 brand-lock.
 * Labels resolved via i18n (myBookings.status.*).
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { InspectionStatus } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';

interface StatusPillStyle {
  bg: string;
  fg: string;
}

function getSellStatusStyle(status: InspectionStatus): StatusPillStyle {
  switch (status) {
    case 'draft':
      return { bg: slate[100], fg: slate[600] };
    case 'in_progress':
      return { bg: brand[100], fg: brand[700] };
    case 'awaiting_inspector_signoff':
      return { bg: brand[100], fg: brand[700] };
    case 'awaiting_customer_signature':
      return { bg: brand[100], fg: brand[900] };
    case 'signed_off':
      // Terminal positive: brand-50 + brand-900 border — NOT emerald.
      return { bg: brand[50], fg: brand[900] };
    default:
      return { bg: slate[100], fg: slate[700] };
  }
}

interface Props {
  status: InspectionStatus;
}

export function SellBookingStatusPill({ status }: Props) {
  const { t } = useTranslation();
  const style = getSellStatusStyle(status);
  const label = t(`myBookings.status.${status}`, { defaultValue: status });

  return (
    <View
      style={[styles.pill, { backgroundColor: style.bg }]}
      accessibilityRole="text"
      accessibilityLabel={t('myBookings.statusA11y', { label })}
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
    minHeight: 24,
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
