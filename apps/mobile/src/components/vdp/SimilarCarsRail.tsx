/**
 * SimilarCarsRail — horizontal rail of up to 5 listing cards.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import { formatKWD, formatKm, filsToKWD } from './vdp.helpers';

interface SimilarItem {
  id: string;
  slug: string;
  year: number;
  mileageKm: number;
  brand: { nameEn: string };
  model: { nameEn: string };
  priceFils: string;
  monthlyFils: string;
  heroPhotoUrl: string | null;
}

interface SimilarCardProps {
  item: SimilarItem;
  onPress: () => void;
}

function SimilarCard({ item, onPress }: SimilarCardProps) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={styles.similarCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.similarCardHero}>
        {item.heroPhotoUrl ? (
          <Image source={{ uri: item.heroPhotoUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={styles.similarCardHeroPlaceholder} />
        )}
      </View>
      <View style={styles.similarCardBody}>
        <Text style={styles.similarCardMeta}>
          {item.year} · {formatKm(item.mileageKm)}
        </Text>
        <Text style={styles.similarCardTitle} numberOfLines={1}>
          {item.brand.nameEn} {item.model.nameEn}
        </Text>
        <Text style={styles.similarCardPrice}>{formatKWD(item.priceFils)}</Text>
        <Text style={styles.similarCardMonthly}>{t('listings.fromMonthly', { value: filsToKWD(item.monthlyFils).toFixed(3) })}</Text>
      </View>
    </TouchableOpacity>
  );
}

interface SimilarCarsRailProps {
  items: SimilarItem[];
  onItemPress: (slug: string) => void;
}

export function SimilarCarsRail({ items, onItemPress }: SimilarCarsRailProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.similarSection}>
      <View style={styles.similarHeader}>
        <Text style={styles.sectionHeading}>{t('vdp.similarCars')}</Text>
        <TouchableOpacity>
          <Text style={styles.linkText}>{t('common.seeAll')}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.similarScroll}
      >
        {items.length > 0 ? (
          items.map((item) => (
            <SimilarCard
              key={item.id}
              item={item}
              onPress={() => onItemPress(item.slug)}
            />
          ))
        ) : (
          [0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.similarCardPlaceholder}>
              <View style={styles.similarCardHeroPlaceholder} />
              <View style={styles.similarCardBody}>
                <View style={styles.placeholderLine} />
                <View style={[styles.placeholderLine, { width: '60%' }]} />
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  similarSection: {
    paddingVertical: 16,
    backgroundColor: slate[50],
  },
  similarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: slate[900],
    marginBottom: 12,
  },
  linkText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: brand[700],
  },
  similarScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  similarCard: {
    width: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    flexShrink: 0,
  },
  similarCardHero: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: brand[100],
    overflow: 'hidden',
    position: 'relative',
  },
  similarCardHeroPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: brand[100],
  },
  similarCardBody: {
    padding: 10,
  },
  similarCardMeta: {
    fontSize: 11,
    color: slate[500],
    fontFamily: fontFamily.regular,
  },
  similarCardTitle: {
    fontSize: 12,
    fontFamily: fontFamily.bold,
    color: slate[900],
    lineHeight: 16,
    marginTop: 2,
  },
  similarCardPrice: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: brand[900],
    marginTop: 4,
  },
  similarCardMonthly: {
    fontSize: 10,
    color: slate[500],
    fontFamily: fontFamily.regular,
    marginTop: 1,
  },
  similarCardPlaceholder: {
    width: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    flexShrink: 0,
  },
  placeholderLine: {
    height: 10,
    backgroundColor: slate[100],
    borderRadius: 4,
    width: '80%',
    marginTop: 6,
  },
});
