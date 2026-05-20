/**
 * DealerCard — conditional dealer/showroom info card.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';

interface DealerCardProps {
  dealerName: string;
  dealerLocation?: string;
}

export function DealerCard({ dealerName, dealerLocation }: DealerCardProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.sectionPadded}>
      <View style={[styles.card, styles.dealerCard]}>
        <View style={styles.dealerAvatar}>
          <Text style={styles.dealerAvatarText}>{t('vdp.dealerAvatar')}</Text>
        </View>
        <View style={styles.dealerInfo}>
          <Text style={styles.dealerName}>{dealerName}</Text>
          <Text style={styles.dealerSub}>
            {dealerLocation
              ? t('vdp.dealerSubWithLocation', { location: dealerLocation })
              : t('vdp.dealerSubVerified')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionPadded: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  dealerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dealerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brand[800],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dealerAvatarText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  dealerInfo: {
    flex: 1,
  },
  dealerName: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    color: slate[900],
  },
  dealerSub: {
    fontSize: 11,
    color: slate[500],
    fontFamily: fontFamily.regular,
    marginTop: 1,
  },
});
