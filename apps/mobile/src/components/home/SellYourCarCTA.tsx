import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily, radius, spacing } from '../../theme/theme';
import { brand } from '../../theme/colors';

type SellYourCarCTAProps = {
  onPress: () => void;
};

export function SellYourCarCTA({ onPress }: SellYourCarCTAProps) {
  const { t } = useTranslation();
  return (
    <View style={s.ctaSection}>
      <Pressable
        style={({ pressed }) => [ctaStyles.card, pressed && ctaStyles.cardPressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('home.ctaA11y')}
      >
        {/* Decorative background shape */}
        <View style={ctaStyles.decoShape} pointerEvents="none" />

        <View>
          <Text style={ctaStyles.eyebrow}>{t('home.ctaEyebrow')}</Text>
          <Text style={ctaStyles.headline}>{t('home.ctaHeadline')}</Text>
          <Text style={ctaStyles.sub}>{t('home.ctaSub')}</Text>
          <View style={ctaStyles.cta}>
            <Text style={ctaStyles.ctaText}>{t('home.ctaInstantValuation')}</Text>
            <Text style={ctaStyles.ctaArrow}>›</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  ctaSection: {
    paddingHorizontal: spacing[4],
    paddingBottom: 20,
  },
});

const ctaStyles = StyleSheet.create({
  card: {
    borderRadius: radius['2xl'],
    backgroundColor: brand[900],
    padding: 20,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.93,
  },
  decoShape: {
    position: 'absolute',
    right: -24,
    bottom: -24,
    width: 176,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: brand[200],
    marginBottom: 4,
  },
  headline: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: spacing[2],
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: brand[100],
    marginBottom: spacing[3],
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    height: 36,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: brand[900],
  },
  ctaArrow: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: brand[900],
  },
});
