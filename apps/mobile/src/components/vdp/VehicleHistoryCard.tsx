/**
 * VehicleHistoryCard — previous owners + accident + service history.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import { CheckIcon } from './vdp.icons';
import { ListingDetail } from './vdp.types';

const rtlChevron = I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : {};

interface VehicleHistoryCardProps {
  detail: ListingDetail;
  onViewHistory: () => void;
}

export function VehicleHistoryCard({ detail, onViewHistory }: VehicleHistoryCardProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.sectionPadded}>
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeading}>{t('vdp.vehicleHistoryTitle')}</Text>
          <View style={styles.verifiedBadge}>
            <CheckIcon size={12} color={brand[800]} />
            <Text style={styles.verifiedBadgeText}>{t('vdp.vehicleHistoryVerified')}</Text>
          </View>
        </View>
        <View style={styles.historyGrid}>
          <View style={styles.historyCell}>
            <Text style={styles.historyCellValue}>{detail.previousOwners ?? 1}</Text>
            <Text style={styles.historyCellLabel}>{t('vdp.previousOwner')}</Text>
          </View>
          <View style={styles.historyCell}>
            <Text style={styles.historyCellValue}>
              {detail.accidentHistory && detail.accidentHistory !== 'clean' && detail.accidentHistory !== 'none' ? '1+' : '0'}
            </Text>
            <Text style={styles.historyCellLabel}>{t('vdp.vehicleHistoryAccidents')}</Text>
          </View>
          <View style={styles.historyCell}>
            <Text style={styles.historyCellValue}>
              {detail.serviceHistory === 'yes' ? '8' : detail.serviceHistory === 'no' ? '0' : '?'}
            </Text>
            <Text style={styles.historyCellLabel}>{t('vdp.serviceRecords')}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.outlineBtn} onPress={onViewHistory} activeOpacity={0.8}>
          <Text style={styles.outlineBtnText}>{t('vdp.vehicleHistoryViewFull')}</Text>
          <Text style={[styles.chevronSmall, rtlChevron]}>›</Text>
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeading: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: slate[900],
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    color: brand[800],
  },
  historyGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  historyCell: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: slate[50],
    borderWidth: 1,
    borderColor: slate[100],
  },
  historyCellValue: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: brand[800],
    lineHeight: 22,
  },
  historyCellLabel: {
    fontSize: 10,
    color: slate[500],
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 13,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    marginTop: 12,
    gap: 4,
  },
  outlineBtnText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: slate[700],
  },
  chevronSmall: {
    fontSize: 16,
    color: brand[700],
    lineHeight: 18,
  },
});
