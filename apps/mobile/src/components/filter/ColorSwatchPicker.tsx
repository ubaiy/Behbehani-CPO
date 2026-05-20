import React from 'react';
import { View, StyleSheet, I18nManager } from 'react-native';
import { SectionHeader, Chip } from './shared';

const EXTERIOR = ['White', 'Black', 'Silver', 'Grey', 'Blue', 'Red'];
const INTERIOR = ['Black', 'Beige', 'Grey', 'Brown'];

export function ColorSwatchPicker() {
  return (
    <>
      {/* Exterior colour */}
      <View style={s.sectionDisabled}>
        <SectionHeader title="Exterior colour" comingSoon />
        <View style={s.chipRow}>
          {EXTERIOR.map(c => (
            <Chip key={c} label={c} selected={false} onPress={() => {}} disabled />
          ))}
        </View>
      </View>

      {/* Interior colour */}
      <View style={s.sectionDisabled}>
        <SectionHeader title="Interior colour" comingSoon />
        <View style={s.chipRow}>
          {INTERIOR.map(c => (
            <Chip key={c} label={c} selected={false} onPress={() => {}} disabled />
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
