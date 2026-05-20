import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, I18nManager } from 'react-native';
import type { BrowseFilters } from '../FilterSheet';
import { fontFamily, palette, radius, spacing } from '../../theme/theme';

export interface FilterChipRailProps {
  activeChips: { key: keyof BrowseFilters; label: string }[];
  activeFilterCount: number;
  onFiltersPress: () => void;
  onRemoveChip: (key: keyof BrowseFilters) => void;
}

export function FilterChipRail({
  activeChips,
  activeFilterCount,
  onFiltersPress,
  onRemoveChip,
}: FilterChipRailProps) {
  return (
    <View style={s.controlBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipRail}
        style={s.chipScroll}
      >
        <TouchableOpacity
          style={[s.filterChipMain, activeFilterCount > 0 && s.filterChipMainActive]}
          onPress={onFiltersPress}
          activeOpacity={0.8}
        >
          <Text style={[s.filterChipMainText, activeFilterCount > 0 && s.filterChipMainTextActive]}>
            {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
          </Text>
        </TouchableOpacity>

        {activeChips.map(chip => (
          <TouchableOpacity
            key={chip.key}
            style={s.activeChip}
            onPress={() => onRemoveChip(chip.key)}
            activeOpacity={0.8}
          >
            <Text style={s.activeChipText}>{chip.label}</Text>
            <Text style={s.activeChipX}>{'×'}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={s.moreFiltersChip}
          onPress={onFiltersPress}
          activeOpacity={0.8}
        >
          <Text style={s.moreFiltersText}>More filters</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  controlBar: {
    backgroundColor: palette.white,
    paddingBottom: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray100,
  },
  chipScroll: {
    paddingTop: spacing[2],
  },
  chipRail: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
  },
  filterChipMain: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.gray300,
    backgroundColor: palette.white,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  filterChipMainActive: {
    backgroundColor: palette.royalBlue800,
    borderColor: palette.royalBlue800,
  },
  filterChipMainText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: palette.gray700,
  },
  filterChipMainTextActive: {
    color: palette.white,
  },
  activeChip: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.royalBlue200,
    backgroundColor: palette.royalBlue50,
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
  },
  activeChipText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: palette.royalBlue800,
  },
  activeChipX: {
    fontSize: 16,
    color: palette.royalBlue600,
    fontFamily: fontFamily.bold,
  },
  moreFiltersChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.white,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  moreFiltersText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: palette.gray600,
  },
});
