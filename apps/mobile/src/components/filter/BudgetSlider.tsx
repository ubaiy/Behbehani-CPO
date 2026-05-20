import React from 'react';
import { View, Text, TextInput, StyleSheet, I18nManager } from 'react-native';
import { SectionHeader } from './shared';
import { fontFamily, palette, radius, spacing } from '../../theme/theme';

const BUDGET_MIN_KWD = 1000;
const BUDGET_MAX_KWD = 25000;

function formatKwd(kwd: number): string {
  return kwd.toLocaleString('en-KW', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

export interface BudgetSliderProps {
  budgetMax: string;
  onChangeBudgetMax: (value: string) => void;
}

export function BudgetSlider({ budgetMax, onChangeBudgetMax }: BudgetSliderProps) {
  return (
    <View style={s.section}>
      <View style={s.budgetHeaderRow}>
        <SectionHeader title="Budget max (KWD)" />
        <Text style={s.budgetValue}>
          {budgetMax
            ? `KWD ${formatKwd(parseFloat(budgetMax))}`
            : `KWD ${formatKwd(BUDGET_MAX_KWD)}`}
        </Text>
      </View>
      <TextInput
        style={s.budgetInput}
        value={budgetMax}
        onChangeText={onChangeBudgetMax}
        keyboardType="numeric"
        placeholder={`${BUDGET_MIN_KWD} – ${BUDGET_MAX_KWD}`}
        placeholderTextColor={palette.gray400}
        returnKeyType="done"
        maxLength={6}
      />
      <View style={s.budgetRange}>
        <Text style={s.budgetRangeLabel}>KWD {formatKwd(BUDGET_MIN_KWD)}</Text>
        <Text style={s.budgetRangeLabel}>KWD {formatKwd(BUDGET_MAX_KWD)}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: {
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray100,
    gap: spacing[3],
  },
  budgetHeaderRow: {
    gap: 0,
  },
  budgetValue: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: palette.royalBlue900,
    marginTop: 2,
  },
  budgetInput: {
    height: 48,
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.gray50,
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: palette.gray900,
  },
  budgetRange: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  budgetRangeLabel: {
    fontSize: 11,
    color: palette.gray400,
    fontFamily: fontFamily.regular,
  },
});
