import React from 'react';
import { View, StyleSheet, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionHeader, Chip } from './shared';

const OPTIONS = [
  { value: 'Petrol', tKey: 'filter.fuelPetrol' },
  { value: 'Diesel', tKey: 'filter.fuelDiesel' },
  { value: 'Hybrid', tKey: 'filter.fuelHybrid' },
  { value: 'Electric', tKey: 'filter.fuelElectric' },
];

export function FuelTypePicker() {
  const { t } = useTranslation();
  return (
    <View style={s.sectionDisabled}>
      <SectionHeader title={t('filter.fuelType')} comingSoon />
      <View style={s.chipRow}>
        {OPTIONS.map(opt => (
          <Chip key={opt.value} label={t(opt.tKey)} selected={false} onPress={() => {}} disabled />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sectionDisabled: {
    opacity: 0.55,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  chipRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
