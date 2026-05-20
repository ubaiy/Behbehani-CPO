import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fontFamily, radius, spacing } from '../../theme/theme';
import { brand, slate } from '../../theme/colors';
import { railStyles } from './ListingRail';

type PriceRange = {
  label: string;
  maxFils: number | null;
};

const PRICE_RANGES: PriceRange[] = [
  { label: 'Under KWD 3,000', maxFils: 3_000_000 },
  { label: 'KWD 3,000 – 6,000', maxFils: 6_000_000 },
  { label: 'KWD 6,000 – 10,000', maxFils: 10_000_000 },
  { label: 'KWD 10,000 – 15,000', maxFils: 15_000_000 },
  { label: 'KWD 15,000 – 20,000', maxFils: 20_000_000 },
  { label: 'KWD 20,000+', maxFils: null },
];

type PriceRangeChipsProps = {
  onPress: (maxFils: number | null) => void;
};

export function PriceRangeChips({ onPress }: PriceRangeChipsProps) {
  return (
    <View style={priceStyles.section}>
      <Text style={railStyles.title}>Shop by Price Range</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={priceStyles.chips}
      >
        {PRICE_RANGES.map((pr) => (
          <Pressable
            key={pr.label}
            style={({ pressed }) => [priceStyles.chip, pressed && priceStyles.chipPressed]}
            onPress={() => onPress(pr.maxFils)}
            accessibilityRole="button"
          >
            <Text style={priceStyles.chipText}>{pr.label}</Text>
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
