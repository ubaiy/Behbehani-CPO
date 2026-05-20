/**
 * TrustBar — 4 icons: Inspected / Warranty / 7-day Return / Home Delivery.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import { ShieldIcon, WarrantyIcon, ReturnIcon, TruckIcon } from './vdp.icons';

interface TrustBadgeProps {
  icon: React.ReactNode;
  label: string;
}

function TrustBadge({ icon, label }: TrustBadgeProps) {
  return (
    <View style={styles.trustBadge}>
      <View style={styles.trustBadgeIcon}>{icon}</View>
      <Text style={styles.trustBadgeLabel}>{label}</Text>
    </View>
  );
}

export function TrustBar() {
  const { t } = useTranslation();
  return (
    <View style={styles.trustBar}>
      <TrustBadge icon={<ShieldIcon size={16} color={brand[700]} />} label={t('vdp.inspected')} />
      <TrustBadge icon={<WarrantyIcon />} label={t('vdp.warranty')} />
      <TrustBadge icon={<ReturnIcon />} label={t('vdp.returnDays')} />
      <TrustBadge icon={<TruckIcon />} label={t('vdp.homeDelivery')} />
    </View>
  );
}

const styles = StyleSheet.create({
  trustBar: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: slate[100],
    justifyContent: 'space-between',
  },
  trustBadge: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  trustBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustBadgeLabel: {
    fontSize: 10,
    fontFamily: fontFamily.semiBold,
    color: slate[700],
    textAlign: 'center',
    lineHeight: 13,
  },
});
