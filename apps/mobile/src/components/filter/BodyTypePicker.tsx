import React from 'react';
import { View, StyleSheet, I18nManager } from 'react-native';
import { SectionHeader, Chip } from './shared';

const BODY_TYPES = [
  'Sedan', 'SUV', 'Hatchback', 'Coupé', 'Pickup',
  'Van', 'Convertible', 'Wagon', 'Crossover',
];

export interface BodyTypePickerProps {
  selected: string | undefined;
  onToggle: (body: string) => void;
}

export function BodyTypePicker({ selected, onToggle }: BodyTypePickerProps) {
  return (
    <View style={s.section}>
      <SectionHeader title="Body type" />
      <View style={s.chipRow}>
        {BODY_TYPES.map(body => (
          <Chip
            key={body}
            label={body}
            selected={selected === body}
            onPress={() => onToggle(body)}
          />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: {
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
