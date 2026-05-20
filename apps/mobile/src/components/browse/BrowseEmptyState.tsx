import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { fontFamily, palette, radius, spacing } from '../../theme/theme';

export interface BrowseEmptyStateProps {
  onReset: () => void;
}

export function BrowseEmptyState({ onReset }: BrowseEmptyStateProps) {
  return (
    <View style={s.emptyWrap}>
      <View style={s.emptyIcon}>
        <Text style={s.emptyIconText}>{'◎'}</Text>
      </View>
      <Text style={s.emptyTitle}>No cars match these filters</Text>
      <Text style={s.emptySub}>
        Try removing a filter or expanding your price range.
      </Text>
      <TouchableOpacity style={s.clearBtn} onPress={onReset}>
        <Text style={s.clearBtnText}>Clear all filters</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[8],
    backgroundColor: palette.gray50,
    gap: spacing[2],
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  emptyIconText: {
    fontSize: 28,
    color: palette.gray400,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    color: palette.gray900,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: palette.gray500,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
  },
  clearBtn: {
    marginTop: spacing[2],
    height: 44,
    paddingHorizontal: spacing[5],
    borderRadius: radius.full,
    backgroundColor: palette.royalBlue800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: palette.white,
  },
});
