import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fontFamily, palette, radius, spacing } from '../../theme/theme';

export type ViewMode = 'list' | 'grid';

export const VIEW_MODE_KEY = 'cpo.browse.viewMode';

export interface ViewToggleProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
}

export function ViewToggle({ viewMode, onChangeViewMode }: ViewToggleProps) {
  const handlePress = (mode: ViewMode) => {
    onChangeViewMode(mode);
    AsyncStorage.setItem(VIEW_MODE_KEY, mode);
  };

  return (
    <View style={s.viewToggle}>
      <TouchableOpacity
        style={[s.viewToggleBtn, viewMode === 'list' && s.viewToggleBtnActive]}
        onPress={() => handlePress('list')}
        accessibilityLabel="List view"
      >
        <Text style={[s.viewToggleIcon, viewMode === 'list' && s.viewToggleIconActive]}>
          {'☰'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.viewToggleBtn, viewMode === 'grid' && s.viewToggleBtnActive]}
        onPress={() => handlePress('grid')}
        accessibilityLabel="Grid view"
      >
        <Text style={[s.viewToggleIcon, viewMode === 'grid' && s.viewToggleIconActive]}>
          {'⊞'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  viewToggle: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.gray200,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 8,
  },
  viewToggleBtnActive: {
    backgroundColor: palette.royalBlue50,
  },
  viewToggleIcon: {
    fontSize: 16,
    color: palette.gray500,
  },
  viewToggleIconActive: {
    color: palette.royalBlue800,
  },
});
