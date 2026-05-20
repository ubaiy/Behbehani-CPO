import React from 'react';
import { View, StyleSheet, I18nManager } from 'react-native';
import { SectionHeader, Chip } from './shared';

const OPTIONS = ['Automatic', 'Manual', 'CVT'];

export function TransmissionPicker() {
  return (
    <View style={s.sectionDisabled}>
      <SectionHeader title="Transmission" comingSoon />
      <View style={s.chipRow}>
        {OPTIONS.map(t => (
          <Chip key={t} label={t} selected={false} onPress={() => {}} disabled />
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
