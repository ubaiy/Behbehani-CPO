import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { fontFamily, palette, radius, spacing } from '../../theme/theme';

export interface BrowseHeaderProps {
  filterCount: number;
  onFilterPress: () => void;
}

export function BrowseHeader({ filterCount, onFilterPress }: BrowseHeaderProps) {
  return (
    <View style={s.header}>
      <Text style={s.headerTitle}>Browse cars</Text>
      <TouchableOpacity
        style={s.headerFilterBtn}
        onPress={onFilterPress}
        accessibilityLabel="Open filters"
        hitSlop={8}
      >
        <View style={s.filterIconStack}>
          <View style={s.filterLine} />
          <View style={[s.filterLine, s.filterLineMid]} />
          <View style={[s.filterLine, s.filterLineShort]} />
        </View>
        {filterCount > 0 && (
          <View style={s.filterBadge}>
            <Text style={s.filterBadgeText}>{filterCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: palette.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray100,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: palette.gray900,
  },
  headerFilterBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIconStack: {
    gap: 4,
    alignItems: 'center',
  },
  filterLine: {
    width: 18,
    height: 2,
    backgroundColor: palette.gray600,
    borderRadius: 1,
  },
  filterLineMid: {
    width: 14,
  },
  filterLineShort: {
    width: 10,
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: palette.royalBlue800,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontSize: 9,
    fontFamily: fontFamily.bold,
    color: palette.white,
    lineHeight: 14,
  },
});
