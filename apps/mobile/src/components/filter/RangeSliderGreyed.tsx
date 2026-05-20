/**
 * Generic greyed-out dual-slider placeholder for Year / Monthly / Mileage.
 * Renders as "Coming soon" — no active state.
 */

import React from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';
import { SectionHeader } from './shared';
import { fontFamily, palette, radius, spacing } from '../../theme/theme';

export interface RangeSliderGreyedProps {
  title: string;
  minLabel: string;
  maxLabel: string;
}

export function RangeSliderGreyed({ title, minLabel, maxLabel }: RangeSliderGreyedProps) {
  return (
    <View style={s.sectionDisabled}>
      <SectionHeader title={title} comingSoon />
      <View style={s.disabledSliderTrack}>
        <View style={s.disabledSliderFill} />
      </View>
      <View style={s.sliderLabels}>
        <Text style={s.sliderLabel}>{minLabel}</Text>
        <Text style={s.sliderLabel}>{maxLabel}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sectionDisabled: {
    opacity: 0.55,
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray100,
    gap: spacing[3],
  },
  disabledSliderTrack: {
    height: 4,
    backgroundColor: palette.gray200,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: 8,
  },
  disabledSliderFill: {
    position: 'absolute',
    left: 0,
    width: '55%',
    height: '100%',
    backgroundColor: palette.royalBlue700,
    opacity: 0.4,
    borderRadius: radius.full,
  },
  sliderLabels: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sliderLabel: {
    fontSize: 11,
    color: palette.gray400,
    fontFamily: fontFamily.regular,
  },
});
