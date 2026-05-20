/**
 * Shared primitives used across filter sub-components.
 * Not exported from the package root — import directly from this file.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily, palette, radius, spacing } from '../../theme/theme';

// ─── SectionHeader ────────────────────────────────────────────────────────────

export interface SectionHeaderProps {
  title: string;
  comingSoon?: boolean;
  rightLabel?: string;
  onRightPress?: () => void;
}

export function SectionHeader({ title, comingSoon, rightLabel, onRightPress }: SectionHeaderProps) {
  const { t } = useTranslation();
  return (
    <View style={ss.sectionTitleRow}>
      <View style={ss.sectionTitleLeft}>
        <Text style={ss.sectionTitle}>{title}</Text>
        {comingSoon && (
          <View style={ss.comingSoonPill}>
            <Text style={ss.comingSoonText}>{t('auth.comingSoon')}</Text>
          </View>
        )}
      </View>
      {rightLabel && (
        <TouchableOpacity onPress={onRightPress} hitSlop={8}>
          <Text style={ss.sectionRightLabel}>{rightLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Chip({ label, selected, onPress, disabled, fullWidth }: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[ss.chip, selected && ss.chipSelected, disabled && ss.chipDisabled, fullWidth && ss.chipFull]}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Text style={[ss.chipText, selected && ss.chipTextSelected, disabled && ss.chipTextDisabled]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── GridChip ─────────────────────────────────────────────────────────────────

export interface GridChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function GridChip({ label, selected, onPress, disabled }: GridChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[ss.gridChip, selected && ss.gridChipSelected, disabled && ss.gridChipDisabled]}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Text style={[ss.gridChipText, selected && ss.gridChipTextSelected, disabled && ss.gridChipTextDisabled]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── ToggleRow ────────────────────────────────────────────────────────────────

export interface ToggleRowProps {
  label: string;
  sublabel: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
}

export function ToggleRow({ label, sublabel, value, onToggle, disabled }: ToggleRowProps) {
  return (
    <View style={[ss.toggleRow, disabled && ss.toggleRowDisabled]}>
      <View style={ss.toggleRowText}>
        <Text style={[ss.toggleLabel, disabled && ss.disabledText]}>{label}</Text>
        <Text style={[ss.toggleSublabel, disabled && ss.disabledText]}>{sublabel}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={disabled ? undefined : onToggle}
        disabled={disabled}
        trackColor={{ false: palette.gray200, true: palette.royalBlue700 }}
        thumbColor={palette.white}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

export const ss = StyleSheet.create({
  sectionTitleRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleLeft: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    color: palette.gray900,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionRightLabel: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: palette.royalBlue700,
  },
  comingSoonPill: {
    backgroundColor: palette.gray200,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontSize: 9,
    fontFamily: fontFamily.semiBold,
    color: palette.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: palette.gray300,
    backgroundColor: palette.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: {
    borderColor: palette.royalBlue700,
    backgroundColor: palette.royalBlue50,
  },
  chipDisabled: {
    backgroundColor: palette.gray100,
    borderColor: palette.gray200,
  },
  chipFull: {
    flex: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: palette.gray700,
  },
  chipTextSelected: {
    fontFamily: fontFamily.semiBold,
    color: palette.royalBlue900,
  },
  chipTextDisabled: {
    color: palette.gray400,
  },
  gridChip: {
    flex: 1,
    minWidth: '30%',
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.white,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
  },
  gridChipSelected: {
    borderColor: palette.royalBlue300,
    backgroundColor: palette.royalBlue50,
  },
  gridChipDisabled: {
    backgroundColor: palette.gray100,
    borderColor: palette.gray200,
  },
  gridChipText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: palette.gray700,
  },
  gridChipTextSelected: {
    fontFamily: fontFamily.semiBold,
    color: palette.royalBlue900,
  },
  gridChipTextDisabled: {
    color: palette.gray400,
  },
  toggleRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.white,
    minHeight: 56,
  },
  toggleRowDisabled: {
    opacity: 0.55,
  },
  toggleRowText: {
    flex: 1,
    marginEnd: spacing[3],
    gap: 2,
  },
  toggleLabel: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: palette.gray900,
  },
  toggleSublabel: {
    fontSize: 11,
    color: palette.gray500,
    fontFamily: fontFamily.regular,
  },
  disabledText: {
    color: palette.gray400,
  },
});
