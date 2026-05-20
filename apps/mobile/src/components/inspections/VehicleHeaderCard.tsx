/**
 * VehicleHeaderCard — vehicle title, mileage/transmission/color subtitle,
 * VIN (last-6 masked) / booking ref / inspected meta rows, CPO badge.
 *
 * VIN is masked client-side ("··· ··· <last6>"); customer-facing surface.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import type { MockInspection } from './inspection.types';

interface Props {
  report: MockInspection;
}

export function VehicleHeaderCard({ report }: Props) {
  const { t } = useTranslation();
  const maskedVin = `··· ··· ${report.vinLastSix}`;

  return (
    <View style={styles.vehicleCard}>
      <Text style={styles.vehicleTitle}>{report.vehicleTitle}</Text>
      <Text style={styles.vehicleSubtitle}>
        {report.mileage} · {report.transmission} · {report.color}
      </Text>
      <View style={styles.vehicleMeta}>
        <View style={styles.vehicleMetaRow}>
          <Text style={styles.metaLabel}>{t('inspection.vehicle.vinLabel')}</Text>
          <Text style={styles.metaValue}>{maskedVin}</Text>
        </View>
        <View style={styles.vehicleMetaRow}>
          <Text style={styles.metaLabel}>{t('inspection.vehicle.bookingRefLabel')}</Text>
          <Text style={styles.metaValue}>{report.bookingRef}</Text>
        </View>
        <View style={styles.vehicleMetaRow}>
          <Text style={styles.metaLabel}>{t('inspection.vehicle.inspectedLabel')}</Text>
          <Text style={[styles.metaValue, styles.metaValueWrap]}>
            {report.inspectedOn} · {report.inspector}
          </Text>
        </View>
      </View>
      <View style={styles.certifiedBadge}>
        <Text style={styles.certifiedBadgeText}>{t('inspection.vehicle.certifiedBadge')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  vehicleCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '800',
    fontSize: 16,
    color: slate[900],
    lineHeight: 22,
  },
  vehicleSubtitle: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontWeight: '500',
    fontSize: 13,
    color: slate[500],
    marginTop: 2,
  },
  vehicleMeta: { marginTop: 12, gap: 6 },
  vehicleMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontWeight: '500',
    fontSize: 11,
    color: slate[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    color: slate[700],
  },
  metaValueWrap: { maxWidth: '60%', textAlign: 'right' },
  certifiedBadge: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: slate[100],
  },
  certifiedBadgeText: {
    alignSelf: 'flex-start',
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
    color: brand[700],
    overflow: 'hidden',
  },
});
