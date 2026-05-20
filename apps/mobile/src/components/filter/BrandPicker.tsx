import React from 'react';
import { View, StyleSheet, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionHeader, GridChip } from './shared';

// Brand names are proper nouns — rendered as-is in both locales.
const BRANDS = [
  'Toyota', 'Lexus', 'Honda', 'Nissan', 'BMW',
  'Mercedes', 'Audi', 'Hyundai', 'Kia', 'Ford',
];

export interface BrandPickerProps {
  selected: string | undefined;
  onToggle: (brand: string) => void;
}

export function BrandPicker({ selected, onToggle }: BrandPickerProps) {
  const { t } = useTranslation();
  return (
    <View style={s.section}>
      <SectionHeader title={t('filter.brand')} rightLabel={t('filter.brandSeeAll')} />
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
