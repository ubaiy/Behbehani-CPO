/**
 * InsuranceStub — third-party + comprehensive quote stub.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';

export function InsuranceStub() {
  const { t } = useTranslation();
  return (
    <View style={styles.sectionPadded}>
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeading}>{t('vdp.indicativeInsurance')}</Text>
          <Text style={styles.estimateLabel}>{t('vdp.estimateLabel')}</Text>
        </View>
        <View style={styles.insuranceRow}>
          <View>
            <Text style={styles.insuranceTier}>{t('vdp.insuranceThirdTier')}</Text>
            <Text style={styles.insuranceSub}>{t('vdp.insuranceThirdSub')}</Text>
          </View>
          <Text style={styles.insurancePrice}>
            {t('vdp.insurancePriceThird')}<Text style={styles.insurancePer}>{t('vdp.insurancePerYear')}</Text>
          </Text>
        </View>
        <View style={[styles.insuranceRow, styles.insuranceRowHighlight]}>
          <View>
            <Text style={styles.insuranceTier}>{t('vdp.insuranceCompTier')}</Text>
            <Text style={styles.insuranceSub}>{t('vdp.insuranceCompSub')}</Text>
          </View>
          <Text style={styles.insurancePrice}>
            {t('vdp.insurancePriceComp')}<Text style={styles.insurancePer}>{t('vdp.insurancePerYear')}</Text>
          </Text>
        </View>
        <Text style={styles.insuranceDisclaimer}>{t('vdp.insuranceDisclaimer')}</Text>
        <TouchableOpacity style={[styles.outlineBtn, styles.disabledBtn]} disabled activeOpacity={1}>
          <Text style={styles.disabledBtnText}>{t('vdp.insuranceActivateAtPurchase')}</Text>
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
  estimateLabel: {
    fontSize: 10,
    fontFamily: fontFamily.semiBold,
    color: slate[400],
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  insuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: slate[50],
    borderWidth: 1,
    borderColor: slate[100],
    marginBottom: 8,
  },
  insuranceRowHighlight: {
    backgroundColor: brand[50],
    borderColor: brand[200],
  },
  insuranceTier: {
    fontSize: 12,
    fontFamily: fontFamily.bold,
    color: slate[900],
  },
  insuranceSub: {
    fontSize: 10,
    color: slate[500],
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  insurancePrice: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: brand[800],
  },
  insurancePer: {
    fontSize: 10,
    color: slate[400],
    fontFamily: fontFamily.regular,
  },
  insuranceDisclaimer: {
    fontSize: 10,
    color: slate[400],
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    marginBottom: 8,
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
  disabledBtn: {
    backgroundColor: slate[50],
    borderColor: slate[200],
  },
  disabledBtnText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: slate[400],
  },
});
