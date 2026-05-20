import React from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';
import { fontFamily, palette, spacing } from '../../theme/theme';

export interface LiveCountHeaderProps {
  count: number;
  isLoading: boolean;
}

export function LiveCountHeader({ count, isLoading }: LiveCountHeaderProps) {
  return (
    <View style={s.countRow}>
      <Text style={s.countText}>
        {isLoading ? '—' : count} cars match
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  countRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: palette.white,
  },
  countText: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: palette.gray900,
  },
});
