import React from 'react';
import { View, StyleSheet, I18nManager } from 'react-native';
import { SectionHeader, GridChip } from './shared';

const BRANDS = [
  'Toyota', 'Lexus', 'Honda', 'Nissan', 'BMW',
  'Mercedes', 'Audi', 'Hyundai', 'Kia', 'Ford',
];

export interface BrandPickerProps {
  selected: string | undefined;
  onToggle: (brand: string) => void;
}

export function BrandPicker({ selected, onToggle }: BrandPickerProps) {
  return (
    <View style={s.section}>
      <SectionHeader title="Brand" rightLabel="See all (24)" />
      <View style={s.brandGrid}>
        {BRANDS.map(brand => (
          <GridChip
            key={brand}
            label={brand}
            selected={selected === brand}
            onPress={() => onToggle(brand)}
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
  brandGrid: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
