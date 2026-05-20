import React from 'react';
import { View, StyleSheet, I18nManager } from 'react-native';
import { SectionHeader, GridChip, Chip } from './shared';

const REGIONAL = ['GCC', 'American', 'European', 'Japanese'];
const CYLINDERS = ['4', '6', '8', '12'];
const DRIVETRAIN = ['FWD', 'RWD', 'AWD', '4WD'];
const SEATS = ['2', '4', '5', '7+'];
const SELLER = ['Platform', 'Dealer', 'Private'];

export function RegionalSpecsPicker() {
  return (
    <>
      {/* Cylinders */}
      <View style={s.sectionDisabled}>
        <SectionHeader title="Cylinders" comingSoon />
        <View style={s.chipRow}>
          {CYLINDERS.map(c => (
            <Chip key={c} label={c} selected={false} onPress={() => {}} disabled />
          ))}
        </View>
      </View>

      {/* Drivetrain */}
      <View style={s.sectionDisabled}>
        <SectionHeader title="Drivetrain" comingSoon />
        <View style={s.drivetrainGrid}>
          {DRIVETRAIN.map(d => (
            <GridChip key={d} label={d} selected={false} onPress={() => {}} disabled />
          ))}
        </View>
      </View>

      {/* Seats */}
      <View style={s.sectionDisabled}>
        <SectionHeader title="Seats" comingSoon />
        <View style={s.chipRow}>
          {SEATS.map(s2 => (
            <Chip key={s2} label={s2} selected={false} onPress={() => {}} disabled />
          ))}
        </View>
      </View>

      {/* Regional specs */}
      <View style={s.sectionDisabled}>
        <SectionHeader title="Regional specs" comingSoon />
        <View style={s.regionalGrid}>
          {REGIONAL.map(r => (
            <GridChip key={r} label={r} selected={false} onPress={() => {}} disabled />
          ))}
        </View>
      </View>

      {/* Seller type */}
      <View style={s.sectionDisabled}>
        <SectionHeader title="Seller type" comingSoon />
        <View style={s.drivetrainGrid}>
          {SELLER.map(s3 => (
            <GridChip key={s3} label={s3} selected={false} onPress={() => {}} disabled />
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
