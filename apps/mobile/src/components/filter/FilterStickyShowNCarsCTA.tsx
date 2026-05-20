import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { fontFamily, palette, radius, spacing } from '../../theme/theme';

export interface FilterStickyShowNCarsCTAProps {
  matchCount: number;
  onApply: () => void;
}

export function FilterStickyShowNCarsCTA({ matchCount, onApply }: FilterStickyShowNCarsCTAProps) {
  return (
    <View style={s.ctaWrap}>
      <TouchableOpacity style={s.ctaBtn} onPress={onApply} activeOpacity={0.85}>
        <Text style={s.ctaText}>Show {matchCount} cars</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  ctaWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray100,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[6],
  },
  ctaBtn: {
    height: 52,
    borderRadius: radius['2xl'],
    backgroundColor: palette.royalBlue900,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: palette.white,
  },
});
