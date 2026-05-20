/**
 * SpecsBlock — 2-col spec grid with VIN last-6 mask + expand/collapse.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import { ListingDetail } from './vdp.types';
import { formatKm, maskVIN } from './vdp.helpers';

const rtlChevron = I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : {};

interface SpecRowProps {
  label: string;
  value: string;
}

function SpecRow({ label, value }: SpecRowProps) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

interface SpecsBlockProps {
  detail: ListingDetail;
}

export function SpecsBlock({ detail }: SpecsBlockProps) {
  const [specsExpanded, setSpecsExpanded] = useState(false);

  const specRows: Array<{ label: string; value: string }> = [
    { label: 'Make', value: detail.brand.nameEn },
    { label: 'Model', value: detail.model.nameEn },
    { label: 'Trim', value: detail.trim ?? '—' },
    { label: 'Year', value: String(detail.year) },
    { label: 'Mileage', value: formatKm(detail.mileageKm) },
    { label: 'Exterior color', value: detail.exteriorColor ?? '—' },
    { label: 'Interior color', value: detail.interiorColor ?? '—' },
    { label: 'Transmission', value: detail.transmission },
    { label: 'Fuel type', value: detail.fuelType },
    { label: 'Cylinders', value: detail.cylinders ? String(detail.cylinders) : '—' },
    { label: 'Drivetrain', value: detail.drivetrain ?? '—' },
    { label: 'Regional specs', value: detail.regionalSpecs ?? '—' },
    { label: 'Body type', value: detail.bodyType.nameEn },
    { label: 'Doors', value: detail.doors ? String(detail.doors) : '—' },
    { label: 'Seats', value: detail.seats ? String(detail.seats) : '—' },
    { label: 'VIN (last 6)', value: maskVIN(detail.vin) },
    { label: 'Previous owners', value: detail.previousOwners != null ? String(detail.previousOwners) : '—' },
  ];

  const visibleSpecs = specsExpanded ? specRows : specRows.slice(0, 6);

  return (
    <View style={[styles.sectionPadded, styles.bgSlate50]}>
      <Text style={styles.sectionHeading}>Vehicle specs</Text>
      <View style={styles.specCard}>
        {visibleSpecs.map((row) => (
          <SpecRow key={row.label} label={row.label} value={row.value} />
        ))}
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setSpecsExpanded((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.expandBtnText}>{specsExpanded ? 'Show less' : 'Show all specs'}</Text>
          <Text style={[styles.chevronSmall, specsExpanded ? styles.chevronUp : null, rtlChevron]}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionPadded: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  bgSlate50: {
    backgroundColor: slate[50],
  },
  sectionHeading: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: slate[900],
    marginBottom: 12,
  },
  specCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: slate[100],
  },
  specLabel: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: slate[500],
    flex: 1,
  },
  specValue: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: slate[900],
    flex: 1,
    textAlign: 'right',
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  expandBtnText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: brand[700],
  },
  chevronSmall: {
    fontSize: 16,
    color: brand[700],
    lineHeight: 18,
  },
  chevronUp: {
    transform: [{ scaleY: -1 }],
  },
});
