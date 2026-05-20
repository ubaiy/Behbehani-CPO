/**
 * WhatHappensNextCard — brand-50 card with 3-step process explainer
 * shown on Step 3 below the review summary.
 */

import { View, Text, StyleSheet } from 'react-native';
import { brand } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';

const STEPS = [
  { icon: '⌚', text: 'Our team confirms your slot within 24 hours.' },
  { icon: '🔧', text: 'Inspector arrives, does 71-point check + photos (~30 min).' },
  { icon: '💰', text: 'You receive a cash offer within 24 hours of inspection.' },
] as const;

export function WhatHappensNextCard() {
  return (
    <View style={ss.nextCard}>
      <Text style={ss.nextCardTitle}>What happens next</Text>
      {STEPS.map(({ icon, text }) => (
        <View key={text} style={ss.nextRow}>
          <Text style={ss.nextIcon}>{icon}</Text>
          <Text style={ss.nextText}>{text}</Text>
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
