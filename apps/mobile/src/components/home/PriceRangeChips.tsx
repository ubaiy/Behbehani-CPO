import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily, radius, spacing } from '../../theme/theme';
import { brand, slate } from '../../theme/colors';
import { railStyles } from './ListingRail';

type PriceRange = {
  labelKey: string;
  maxFils: number | null;
};

const PRICE_RANGES: PriceRange[] = [
  { labelKey: 'home.priceRangeUnder3k', maxFils: 3_000_000 },
  { labelKey: 'home.priceRange3to6k', maxFils: 6_000_000 },
  { labelKey: 'home.priceRange6to10k', maxFils: 10_000_000 },
  { labelKey: 'home.priceRange10to15k', maxFils: 15_000_000 },
  { labelKey: 'home.priceRange15to20k', maxFils: 20_000_000 },
  { labelKey: 'home.priceRange20kPlus', maxFils: null },
];

type PriceRangeChipsProps = {
  onPress: (maxFils: number | null) => void;
};

export function PriceRangeChips({ onPress }: PriceRangeChipsProps) {
  const { t } = useTranslation();
  return (
    <View style={priceStyles.section}>
      <Text style={railStyles.title}>{t('home.shopByPriceRange')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={priceStyles.chips}
      >
        {PRICE_RANGES.map((pr) => (
          <Pressable
            key={pr.labelKey}
            style={({ pressed }) => [priceStyles.chip, pressed && priceStyles.chipPressed]}
            onPress={() => onPress(pr.maxFils)}
            accessibilityRole="button"
          >
            <Text style={priceStyles.chipText}>{t(pr.labelKey)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const priceStyles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing[4],
    paddingBottom: 20,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
    paddingRight: spacing[4],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: slate[300],
    minHeight: 44,
    backgroundColor: '#FFFFFF',
  },
  chipPressed: {
    backgroundColor: brand[50],
    borderColor: brand[300],
  },
  chipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: slate[700],
  },
});
