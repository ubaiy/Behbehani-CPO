import React from 'react';
import { View, StyleSheet, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionHeader, Chip } from './shared';

// Body-type canonical slugs are stable across locales (used as filter keys);
// the display label is translated via the matching `filter.bodyType*` key.
const BODY_TYPES: { value: string; tKey: string }[] = [
  { value: 'Sedan', tKey: 'filter.bodyTypeSedan' },
  { value: 'SUV', tKey: 'filter.bodyTypeSuv' },
  { value: 'Hatchback', tKey: 'filter.bodyTypeHatchback' },
  { value: 'Coupé', tKey: 'filter.bodyTypeCoupe' },
  { value: 'Pickup', tKey: 'filter.bodyTypePickup' },
  { value: 'Van', tKey: 'filter.bodyTypeVan' },
  { value: 'Convertible', tKey: 'filter.bodyTypeConvertible' },
  { value: 'Wagon', tKey: 'filter.bodyTypeWagon' },
  { value: 'Crossover', tKey: 'filter.bodyTypeCrossover' },
];

export interface BodyTypePickerProps {
  selected: string | undefined;
  onToggle: (body: string) => void;
}

export function BodyTypePicker({ selected, onToggle }: BodyTypePickerProps) {
  const { t } = useTranslation();
  return (
    <View style={s.section}>
      <SectionHeader title={t('filter.bodyType')} />
      <View style={s.chipRow}>
        {BODY_TYPES.map(body => (
          <Chip
            key={body.value}
            label={t(body.tKey)}
            selected={selected === body.value}
            onPress={() => onToggle(body.value)}
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
