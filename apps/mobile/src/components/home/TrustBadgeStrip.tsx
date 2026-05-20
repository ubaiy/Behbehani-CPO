import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontFamily, radius, spacing } from '../../theme/theme';
import { brand } from '../../theme/colors';

const TRUST_BADGES = ['Inspected', 'Insured', 'Returnable', 'Delivered'] as const;

function CheckBadge({ label }: { label: string }) {
  return (
    <View style={trustStyles.pill}>
      <Text style={trustStyles.check}>✓</Text>
      <Text style={trustStyles.label}>{label}</Text>
    </View>
  );
}

export function TrustBadgeStrip({ containerStyle }: { containerStyle?: object }) {
  return (
    <View style={[stripStyles.strip, containerStyle]}>
      {TRUST_BADGES.map((badge) => (
        <CheckBadge key={badge} label={badge} />
      ))}
    </View>
  );
}

const stripStyles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: spacing[2],
  },
});

const trustStyles = StyleSheet.create({
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    backgroundColor: brand[50],
    borderWidth: 1.5,
    borderColor: brand[200],
    minHeight: 32,
  },
  check: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: brand[700],
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: brand[900],
  },
});
