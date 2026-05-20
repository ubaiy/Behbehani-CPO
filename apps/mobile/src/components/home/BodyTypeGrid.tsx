import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily, radius, spacing } from '../../theme/theme';
import { brand, slate } from '../../theme/colors';
import { railStyles } from './ListingRail';

type BodyTypeItem = {
  slug: string;
  labelKey: string;
  svgPath: string;
};

const BODY_TYPES: BodyTypeItem[] = [
  { slug: 'sedan', labelKey: 'home.bodySedan', svgPath: 'M6 22C6 22 8 14 14 11C18 9 22 8 28 8C34 8 36 9 40 11C44 13 46 18 46 22Z' },
  { slug: 'suv', labelKey: 'home.bodySuv', svgPath: 'M4 22C4 22 5 12 12 9C16 7 20 6 28 6C35 6 38 8 42 12C45 15 46 20 46 22Z' },
  { slug: 'hatchback', labelKey: 'home.bodyHatchback', svgPath: 'M5 22C5 22 6 14 13 11C17 9 21 8 28 8C35 8 38 10 42 14C44 17 45 20 45 22Z' },
  { slug: 'coupe', labelKey: 'home.bodyCoupe', svgPath: 'M5 22C5 22 7 15 14 12C19 10 24 9 30 9C37 9 40 11 43 15C45 18 45 21 45 22Z' },
  { slug: 'pickup', labelKey: 'home.bodyPickup', svgPath: 'M4 22L4 16L10 16L12 10L26 10L28 16L44 16L44 22Z' },
  { slug: 'van', labelKey: 'home.bodyVan', svgPath: 'M4 22L4 8L36 8L44 14L44 22Z' },
  { slug: 'convertible', labelKey: 'home.bodyConvertible', svgPath: 'M3 22C3 22 5 11 12 9C16 8 22 7 28 7C36 7 42 11 45 17C45 17 38 16 28 16C18 16 10 18 3 22Z' },
  { slug: 'wagon', labelKey: 'home.bodyWagon', svgPath: 'M4 22L4 12L20 12L24 6L40 6L44 12L44 22Z' },
  { slug: 'crossover', labelKey: 'home.bodyCrossover', svgPath: 'M4 22L4 6L36 6L44 14L44 22Z' },
];

function BodyTypeCard({ item, onPress }: { item: BodyTypeItem; onPress: (slug: string) => void }) {
  const { t } = useTranslation();
  const label = t(item.labelKey);
  return (
    <Pressable
      style={({ pressed }) => [
        bodyStyles.card,
        pressed && bodyStyles.cardPressed,
      ]}
      onPress={() => onPress(item.slug)}
      accessibilityRole="button"
      accessibilityLabel={t('home.browseBodyA11y', { label })}
    >
      <View style={bodyStyles.iconCircle}>
        <Text style={bodyStyles.iconText}>🚗</Text>
      </View>
      <Text style={bodyStyles.cardLabel}>{label}</Text>
    </Pressable>
  );
}

type BodyTypeGridProps = {
  onPress: (slug: string) => void;
};

export function BodyTypeGrid({ onPress }: BodyTypeGridProps) {
  const { t } = useTranslation();
  return (
    <View style={bodyStyles.section}>
      <Text style={railStyles.title}>{t('home.shopByBodyType')}</Text>
      <View style={bodyStyles.grid}>
        {BODY_TYPES.map((bt) => (
          <BodyTypeCard key={bt.slug} item={bt} onPress={onPress} />
        ))}
      </View>
    </View>
  );
}

const bodyStyles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing[4],
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  card: {
    width: '30.5%',
    minHeight: 88,
    borderRadius: radius['2xl'],
    backgroundColor: slate[50],
    borderWidth: 1,
    borderColor: slate[200],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
  },
  cardPressed: {
    backgroundColor: brand[50],
    borderColor: brand[200],
  },
  iconCircle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  cardLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: slate[700],
    textAlign: 'center',
  },
});
