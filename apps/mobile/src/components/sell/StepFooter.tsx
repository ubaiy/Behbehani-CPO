/**
 * StepFooter — sticky Back/Next CTAs rendered at the bottom of each step.
 * Step 1: primary CTA only (no Back button shown — back is in the hero).
 * Steps 2-3: Back + primary CTA side-by-side.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import type { Step } from './types';

interface StepFooterProps {
  step: Step;
  primaryLabel: string;
  onPrimary: () => void;
  onBack?: () => void;
}

export function StepFooter({ step, primaryLabel, onPrimary, onBack }: StepFooterProps) {
  if (step === 1) {
    return (
      <Pressable
        style={({ pressed }) => [ss.ctaPrimary, pressed && ss.ctaPrimaryPressed]}
        onPress={onPrimary}
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
      >
        <Text style={ss.ctaPrimaryText}>{primaryLabel}</Text>
      </Pressable>
    );
  }

  return (
    <View style={ss.twoFooter}>
      <Pressable
        style={({ pressed }) => [ss.btnBack, pressed && ss.btnBackPressed]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Text style={ss.btnBackText}>Back</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [ss.ctaPrimary, ss.ctaFlex, pressed && ss.ctaPrimaryPressed]}
        onPress={onPrimary}
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
      >
        <Text style={ss.ctaPrimaryText}>{primaryLabel}</Text>
      </Pressable>
    </View>
  );
}

const ss = StyleSheet.create({
  ctaPrimary: {
    height: 48,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  ctaPrimaryPressed: { backgroundColor: brand[800] },
  ctaPrimaryText: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: '#ffffff',
  },
  ctaFlex: { flex: 1 },
  twoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  btnBack: {
    height: 48,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnBackPressed: { backgroundColor: slate[50] },
  btnBackText: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: slate[700],
  },
});
