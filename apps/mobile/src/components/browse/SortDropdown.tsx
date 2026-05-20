import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
  Platform,
} from 'react-native';
import type { PublicListingSort } from '@behbehani-cpo/shared-types';
import { fontFamily, palette, radius, spacing, shadows } from '../../theme/theme';

export type SortOption = PublicListingSort;

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'priceAsc', label: 'Price: low to high' },
  { value: 'priceDesc', label: 'Price: high to low' },
  { value: 'mileageAsc', label: 'Mileage: low to high' },
  { value: 'newest', label: 'Newest first' },
];

export interface SortDropdownProps {
  visible: boolean;
  currentSort: SortOption;
  onSelect: (sort: SortOption) => void;
  onClose: () => void;
}

export function SortDropdown({ visible, currentSort, onSelect, onClose }: SortDropdownProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={s.sortOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={s.sortPopover}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[s.sortOption, currentSort === opt.value && s.sortOptionActive]}
              onPress={() => onSelect(opt.value)}
            >
              <Text style={[s.sortOptionText, currentSort === opt.value && s.sortOptionTextActive]}>
                {opt.label}
              </Text>
              {currentSort === opt.value && (
                <Text style={s.sortOptionCheck}>{'✓'}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  sortOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 180 : 150,
    paddingRight: spacing[4],
  },
  sortPopover: {
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.gray200,
    minWidth: 200,
    overflow: 'hidden',
    ...shadows.md,
  },
  sortOption: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: 14,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray100,
  },
  sortOptionActive: {
    backgroundColor: palette.royalBlue50,
  },
  sortOptionText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: palette.gray700,
  },
  sortOptionTextActive: {
    fontFamily: fontFamily.semiBold,
    color: palette.royalBlue800,
  },
  sortOptionCheck: {
    fontSize: 14,
    color: palette.royalBlue700,
    fontFamily: fontFamily.bold,
  },
});
