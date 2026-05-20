/**
 * WhatHappensNextCard — brand-50 card with 3-step process explainer
 * shown on Step 3 below the review summary.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';

const STEP_ICONS = ['⌚', '🔧', '💰'] as const;

export function WhatHappensNextCard() {
  const { t } = useTranslation();
  const bullets = [
    t('sell.whatHappensNext.bullet1'),
    t('sell.whatHappensNext.bullet2'),
    t('sell.whatHappensNext.bullet3'),
  ];
  return (
    <View style={ss.nextCard}>
      <Text style={ss.nextCardTitle}>{t('sell.whatHappensNext.title')}</Text>
      {STEP_ICONS.map((icon, i) => (
        <View key={i} style={ss.nextRow}>
          <Text style={ss.nextIcon}>{icon}</Text>
          <Text style={ss.nextText}>{bullets[i]}</Text>
        </View>
      ))}
    </View>
  );
}

const ss = StyleSheet.create({
  nextCard: {
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    gap: 10,
  },
  nextCardTitle: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    color: brand[700],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  nextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  nextIcon: { fontSize: 18, flexShrink: 0, marginTop: 1 },
  nextText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: brand[900],
    lineHeight: 20,
  },
});
