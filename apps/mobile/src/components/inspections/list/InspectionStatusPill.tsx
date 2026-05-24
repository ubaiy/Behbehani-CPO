/**
 * InspectionStatusPill — inline pill for inspection status.
 *
 * Maps InspectionStatus enum values to brand-correct bg/fg tokens.
 * Brand-only + slate palette; no amber/green per CLAUDE.md global rule.
 * Labels resolved through i18n (inspection.statusPill.*).
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { InspectionStatus } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../../theme/colors';

interface StatusPillStyle {
  bg: string;
  fg: string;
}

function getInspectionStatusStyle(status: InspectionStatus): StatusPillStyle {
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
      return { bg: brand[100], fg: brand[900] };
    default:
      return { bg: slate[100], fg: slate[700] };
  }
}

interface Props {
  status: InspectionStatus;
}

export function InspectionStatusPill({ status }: Props) {
  const { t } = useTranslation();
  const style = getInspectionStatusStyle(status);
  const label = t(`inspection.statusPill.${status}`);

  return (
    <View
      style={[styles.pill, { backgroundColor: style.bg }]}
      accessibilityRole="text"
      accessibilityLabel={t('inspection.statusPill.a11y', { label })}
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
