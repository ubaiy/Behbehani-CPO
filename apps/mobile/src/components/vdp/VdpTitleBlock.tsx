/**
 * VdpTitleBlock — year/brand/model/price/monthly-est + inspected badge + TrustBar.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import { ShieldIcon, CreditCardIcon } from './vdp.icons';
import { TrustBar } from './TrustBar';
import { formatKWD, formatKm, filsToKWD } from './vdp.helpers';
import { ListingDetail } from './vdp.types';

interface VdpTitleBlockProps {
  detail: ListingDetail;
  priceFils: string;
  monthlyFils: string;
}

export function VdpTitleBlock({ detail, priceFils, monthlyFils }: VdpTitleBlockProps) {
  return (
    <View style={styles.titleSection}>
      {/* Inspection badge */}
      {detail.inspected && (
        <View style={styles.inspectedBadge}>
          <ShieldIcon size={12} color={brand[800]} />
          <Text style={styles.inspectedBadgeText}>Al Daman inspected · 200 pts</Text>
        </View>
      )}

      <Text style={styles.vehicleTitle}>
        {detail.year} {detail.brand.nameEn} {detail.model.nameEn}
        {detail.trim ? ` ${detail.trim}` : ''}
      </Text>
      <Text style={styles.vehicleSubtitle}>
        {detail.bodyType.nameEn} · {formatKm(detail.mileageKm)} · {detail.transmission} · {detail.fuelType}
      </Text>

      {/* Price */}
      <Text style={styles.priceText}>{formatKWD(priceFils)}</Text>

      {/* Monthly estimate pill */}
      <View style={styles.monthlyPill}>
        <CreditCardIcon />
        <Text style={styles.monthlyPillText}>
          From KWD {filsToKWD(monthlyFils).toFixed(3)}
          <Text style={styles.monthlyPillSuffix}>/mo</Text>
        </Text>
        <Text style={styles.monthlyPillNote}>48 mo · 20% down</Text>
      </View>

      <TrustBar />
    </View>
  );
}

const styles = StyleSheet.create({
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  inspectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  inspectedBadgeText: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    color: brand[800],
  },
  vehicleTitle: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    color: slate[900],
    lineHeight: 28,
    marginTop: 4,
  },
  vehicleSubtitle: {
    fontSize: 13,
    color: slate[500],
    fontFamily: fontFamily.regular,
    marginTop: 4,
  },
  priceText: {
    fontSize: 32,
    fontFamily: fontFamily.bold,
    color: slate[900],
    marginTop: 8,
    lineHeight: 36,
  },
  monthlyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[100],
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  monthlyPillText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: brand[800],
  },
  monthlyPillSuffix: {
    fontFamily: fontFamily.regular,
    color: slate[500],
  },
  monthlyPillNote: {
    fontSize: 10,
    color: slate[400],
    fontFamily: fontFamily.regular,
  },
});
