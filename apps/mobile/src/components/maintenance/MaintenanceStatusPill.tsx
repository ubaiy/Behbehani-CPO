/**
 * MaintenanceStatusPill — inline pill for maintenance request status.
 *
 * Maps MaintenanceRequestStatus enum values to brand-correct bg/fg tokens.
 * 5 status values: pending_review | scheduled | in_progress | completed | cancelled
 *
 * Brand-only + slate palette; no green per CLAUDE.md global rule.
 * Labels resolved through i18n (maintenance.status.*).
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MaintenanceRequestStatus } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';

interface StatusPillStyle {
  bg: string;
  fg: string;
}

function getMaintenanceStatusStyle(status: MaintenanceRequestStatus): StatusPillStyle {
  switch (status) {
    case 'pending_review':
      return { bg: slate[100], fg: slate[600] };
    case 'scheduled':
      return { bg: brand[100], fg: brand[700] };
    case 'in_progress':
      return { bg: brand[100], fg: brand[700] };
    case 'completed':
      return { bg: brand[100], fg: brand[900] };
    case 'cancelled':
      return { bg: slate[100], fg: slate[500] };
    default:
      return { bg: slate[100], fg: slate[700] };
  }
}

interface Props {
  status: MaintenanceRequestStatus;
}

export function MaintenanceStatusPill({ status }: Props) {
  const { t } = useTranslation();
  const style = getMaintenanceStatusStyle(status);
  const label = t(`maintenance.status.${status}`, { defaultValue: status });

  return (
    <View
      style={[styles.pill, { backgroundColor: style.bg }]}
      accessibilityRole="text"
      accessibilityLabel={label}
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
