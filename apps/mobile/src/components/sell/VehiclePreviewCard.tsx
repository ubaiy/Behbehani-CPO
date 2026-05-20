/**
 * VehiclePreviewCard — "YOUR CAR · 2021 Toyota Camry · 42,000 km" + Edit link.
 * Always visible under the hero across all 3 steps.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import type { SellFormState } from './types';

interface VehiclePreviewCardProps {
  form: Pick<
    SellFormState,
    'vehicleYear' | 'vehicleBrand' | 'vehicleModel' | 'vehicleMileageKm'
  >;
}

export function VehiclePreviewCard({ form }: VehiclePreviewCardProps) {
  const { t } = useTranslation();
  return (
    <View style={ss.vehicleCard}>
      <View style={ss.vehicleIconBox}>
        <Text style={ss.vehicleIcon}>🚗</Text>
      </View>
      <View style={ss.vehicleInfo}>
        <Text style={ss.vehicleEyebrow}>{t('sell.vehicle.eyebrow')}</Text>
        <Text style={ss.vehicleLabel} numberOfLines={1}>
          {form.vehicleYear} {form.vehicleBrand} {form.vehicleModel} ·{' '}
          {form.vehicleMileageKm.toLocaleString()} km
        </Text>
      </View>
      {/* TODO: link to upstream vehicle entry screen once it exists */}
      <Pressable hitSlop={8}>
        <Text style={ss.editLink}>{t('sell.vehicle.editLink')}</Text>
      </Pressable>
    </View>
  );
}

const ss = StyleSheet.create({
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: brand[100],
    backgroundColor: brand[50],
  },
  vehicleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vehicleIcon: { fontSize: 18 },
  vehicleInfo: { flex: 1, minWidth: 0 },
  vehicleEyebrow: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    color: brand[700],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  vehicleLabel: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: slate[900],
  },
  editLink: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: brand[700],
  },
});
