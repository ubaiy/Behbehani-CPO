/**
 * SpecsBlock — 2-col spec grid with VIN last-6 mask + expand/collapse.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [specsExpanded, setSpecsExpanded] = useState(false);

  const specRows: Array<{ label: string; value: string }> = [
    { label: t('vdp.make'), value: detail.brand.nameEn },
    { label: t('vdp.model'), value: detail.model.nameEn },
    { label: t('vdp.trim'), value: detail.trim ?? '—' },
    { label: t('vdp.year'), value: String(detail.year) },
    { label: t('vdp.mileage'), value: formatKm(detail.mileageKm) },
    { label: t('vdp.exteriorColor'), value: detail.exteriorColor ?? '—' },
    { label: t('vdp.interiorColor'), value: detail.interiorColor ?? '—' },
    { label: t('vdp.transmission'), value: detail.transmission },
    { label: t('vdp.fuelType'), value: detail.fuelType },
    { label: t('filter.cylinders'), value: detail.cylinders ? String(detail.cylinders) : '—' },
    { label: t('filter.drivetrain'), value: detail.driveTrain ?? '—' },
    { label: t('vdp.regionalSpecs'), value: detail.regionalSpecs ?? '—' },
    { label: t('filter.bodyType'), value: detail.bodyType.nameEn },
    { label: t('vdp.doors'), value: detail.doors ? String(detail.doors) : '—' },
    { label: t('vdp.seats'), value: detail.seats ? String(detail.seats) : '—' },
    { label: t('vdp.vinLast6'), value: maskVIN(detail.vin) },
    { label: t('vdp.previousOwners'), value: detail.previousOwners != null ? String(detail.previousOwners) : '—' },
  ];

  const visibleSpecs = specsExpanded ? specRows : specRows.slice(0, 6);

  return (
    <View style={[styles.sectionPadded, styles.bgSlate50]}>
      <Text style={styles.sectionHeading}>{t('vdp.specsTitle')}</Text>
      <View style={styles.specCard}>
        {visibleSpecs.map((row) => (
          <SpecRow key={row.label} label={row.label} value={row.value} />
        ))}
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setSpecsExpanded((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.expandBtnText}>{specsExpanded ? t('vdp.showLess') : t('vdp.showAllSpecs')}</Text>
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
