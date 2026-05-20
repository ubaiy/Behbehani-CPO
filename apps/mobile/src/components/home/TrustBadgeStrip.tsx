import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily, radius, spacing } from '../../theme/theme';
import { brand } from '../../theme/colors';

const TRUST_BADGE_KEYS = [
  'home.trustInspected',
  'home.trustInsured',
  'home.trustReturnable',
  'home.trustDelivered',
] as const;

function CheckBadge({ label }: { label: string }) {
  return (
    <View style={trustStyles.pill}>
      <Text style={trustStyles.check}>✓</Text>
      <Text style={trustStyles.label}>{label}</Text>
    </View>
  );
}

export function TrustBadgeStrip({ containerStyle }: { containerStyle?: object }) {
  const { t } = useTranslation();
  return (
    <View style={[stripStyles.strip, containerStyle]}>
      {TRUST_BADGE_KEYS.map((key) => (
        <CheckBadge key={key} label={t(key)} />
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
