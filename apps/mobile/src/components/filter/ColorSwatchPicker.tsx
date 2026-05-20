import React from 'react';
import { View, StyleSheet, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionHeader, Chip } from './shared';

const EXTERIOR: { value: string; tKey: string }[] = [
  { value: 'White', tKey: 'filter.color.white' },
  { value: 'Black', tKey: 'filter.color.black' },
  { value: 'Silver', tKey: 'filter.color.silver' },
  { value: 'Grey', tKey: 'filter.color.grey' },
  { value: 'Blue', tKey: 'filter.color.blue' },
  { value: 'Red', tKey: 'filter.color.red' },
];
const INTERIOR: { value: string; tKey: string }[] = [
  { value: 'Black', tKey: 'filter.color.black' },
  { value: 'Beige', tKey: 'filter.color.beige' },
  { value: 'Grey', tKey: 'filter.color.grey' },
  { value: 'Brown', tKey: 'filter.color.brown' },
];

export function ColorSwatchPicker() {
  const { t } = useTranslation();
  return (
    <>
      {/* Exterior colour */}
      <View style={s.sectionDisabled}>
        <SectionHeader title={t('filter.exteriorColor')} comingSoon />
        <View style={s.chipRow}>
          {EXTERIOR.map(c => (
            <Chip key={c.value} label={t(c.tKey)} selected={false} onPress={() => {}} disabled />
          ))}
        </View>
      </View>

      {/* Interior colour */}
      <View style={s.sectionDisabled}>
        <SectionHeader title={t('filter.interiorColor')} comingSoon />
        <View style={s.chipRow}>
          {INTERIOR.map(c => (
            <Chip key={c.value} label={t(c.tKey)} selected={false} onPress={() => {}} disabled />
          ))}
        </View>
      </View>
    </>
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
