/**
 * InspectionListItem — single row card in the inspections list (Task v0.16).
 *
 * Structure:
 *   [booking ref · status pill]
 *   [vehicle title: year brand model]
 *   [VIN masked · mileage]
 *   [scheduled date]          [offer summary?]
 *
 * Touch target: entire row is the press target, minHeight ≥ 88px.
 * VIN uses server-provided `vinMasked` — no client-side masking needed.
 * KWD via formatKwd from orders.utils (shared helper — no duplication).
 */

import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CustomerInspectionView } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../../theme/colors';
import { formatKwd, formatDate } from '../../orders/orders.utils';
import { InspectionStatusPill } from './InspectionStatusPill';

interface Props {
  inspection: CustomerInspectionView;
  onPress: () => void;
}

export function InspectionListItem({ inspection, onPress }: Props) {
  const { t } = useTranslation();

  const { vehicle, latestOffer, scheduledFor, bookingRef } = inspection;

  // Vehicle title — fallback to t key when any part is null.
  const hasVehicleTitle = vehicle.year || vehicle.brand || vehicle.model;
  const vehicleTitle = hasVehicleTitle
    ? [vehicle.year, vehicle.brand, vehicle.model].filter(Boolean).join(' ')
    : t('inspection.list.vehicleUnknown');

  // Mileage
  const mileage =
    vehicle.mileageKm !== null && vehicle.mileageKm !== undefined
      ? `${vehicle.mileageKm.toLocaleString('en-KW')} ${t('inspection.list.kmUnit')}`
      : null;

  // Short booking ref display
  const shortRef = `#${bookingRef}`;

  // Offer summary
  const offerLine =
    latestOffer !== null && latestOffer !== undefined
      ? t('inspection.list.offerSummary', {
          amount: formatKwd(latestOffer.amountFils as string | number),
          status: t(`inspection.statusPill.${latestOffer.status}`, { defaultValue: latestOffer.status }),
        })
      : null;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${t('inspection.list.itemA11y', { ref: shortRef, vehicle: vehicleTitle })}`}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      {/* Row 1: booking ref + status */}
      <View style={styles.headerRow}>
        <Text style={styles.refText}>{shortRef}</Text>
        <InspectionStatusPill status={inspection.status} />
      </View>

      {/* Row 2: vehicle title */}
      <Text style={styles.vehicleTitle} numberOfLines={1}>
        {vehicleTitle}
      </Text>

      {/* Row 3: VIN masked + mileage */}
      {(vehicle.vinMasked || mileage) ? (
        <View style={styles.metaRow}>
          {vehicle.vinMasked ? (
            <Text style={styles.metaText} numberOfLines={1}>
              {vehicle.vinMasked}
            </Text>
          ) : null}
          {mileage ? (
            <Text style={styles.metaText}>{mileage}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Row 4: scheduled date + offer summary */}
      {(scheduledFor || offerLine) ? (
        <View style={styles.footerRow}>
          {scheduledFor ? (
            <Text style={styles.dateText}>
              {t('inspection.list.scheduledLabel')} {formatDate(scheduledFor)}
            </Text>
          ) : (
            <View />
          )}
          {offerLine ? (
            <Text style={styles.offerText} numberOfLines={1}>
              {offerLine}
            </Text>
          ) : null}
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
  vehicleTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: slate[900],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: slate[500],
    letterSpacing: 0.2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: 8,
  },
  dateText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: slate[500],
    flexShrink: 1,
  },
  offerText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: brand[700],
    flexShrink: 1,
    textAlign: 'right',
  },
});
