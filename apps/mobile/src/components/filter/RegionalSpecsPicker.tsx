import React from 'react';
import { View, StyleSheet, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionHeader, GridChip, Chip } from './shared';

// Numeric labels (cylinders/seats) and acronyms (FWD/RWD/AWD/4WD) are
// universal across locales — left as-is. Words (Regional / Seller) are keyed.
const CYLINDERS = ['4', '6', '8', '12'];
const DRIVETRAIN = ['FWD', 'RWD', 'AWD', '4WD'];
const SEATS = ['2', '4', '5', '7+'];
const REGIONAL: { value: string; tKey: string }[] = [
  { value: 'GCC', tKey: 'filter.regionGcc' },
  { value: 'American', tKey: 'filter.regionAmerican' },
  { value: 'European', tKey: 'filter.regionEuropean' },
  { value: 'Japanese', tKey: 'filter.regionJapanese' },
];
const SELLER: { value: string; tKey: string }[] = [
  { value: 'Platform', tKey: 'filter.sellerPlatform' },
  { value: 'Dealer', tKey: 'filter.sellerDealer' },
  { value: 'Private', tKey: 'filter.sellerPrivate' },
];

export function RegionalSpecsPicker() {
  const { t } = useTranslation();
  return (
    <>
      {/* Cylinders */}
      <View style={s.sectionDisabled}>
        <SectionHeader title={t('filter.cylinders')} comingSoon />
        <View style={s.chipRow}>
          {CYLINDERS.map(c => (
            <Chip key={c} label={c} selected={false} onPress={() => {}} disabled />
          ))}
        </View>
      </View>

      {/* Drivetrain */}
      <View style={s.sectionDisabled}>
        <SectionHeader title={t('filter.drivetrain')} comingSoon />
        <View style={s.drivetrainGrid}>
          {DRIVETRAIN.map(d => (
            <GridChip key={d} label={d} selected={false} onPress={() => {}} disabled />
          ))}
        </View>
      </View>

      {/* Seats */}
      <View style={s.sectionDisabled}>
        <SectionHeader title={t('filter.seats')} comingSoon />
        <View style={s.chipRow}>
          {SEATS.map(s2 => (
            <Chip key={s2} label={s2} selected={false} onPress={() => {}} disabled />
          ))}
        </View>
      </View>

      {/* Regional specs */}
      <View style={s.sectionDisabled}>
        <SectionHeader title={t('filter.regionalSpecs')} comingSoon />
        <View style={s.regionalGrid}>
          {REGIONAL.map(r => (
            <GridChip key={r.value} label={t(r.tKey)} selected={false} onPress={() => {}} disabled />
          ))}
        </View>
      </View>

      {/* Seller type */}
      <View style={s.sectionDisabled}>
        <SectionHeader title={t('filter.sellerType')} comingSoon />
        <View style={s.drivetrainGrid}>
          {SELLER.map(s3 => (
            <GridChip key={s3.value} label={t(s3.tKey)} selected={false} onPress={() => {}} disabled />
          ))}
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  sectionDisabled: {
    opacity: 0.55,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  chipRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  drivetrainGrid: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    gap: 8,
  },
  regionalGrid: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
