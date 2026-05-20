import React from 'react';
import { View, StyleSheet, I18nManager } from 'react-native';
import { SectionHeader, Chip } from './shared';

const OPTIONS = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];

export function FuelTypePicker() {
  return (
    <View style={s.sectionDisabled}>
      <SectionHeader title="Fuel type" comingSoon />
      <View style={s.chipRow}>
        {OPTIONS.map(f => (
          <Chip key={f} label={f} selected={false} onPress={() => {}} disabled />
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
