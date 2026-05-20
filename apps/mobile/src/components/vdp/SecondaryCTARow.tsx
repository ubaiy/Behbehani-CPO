/**
 * SecondaryCTARow — Make an Offer / Book Test Drive / Apply for Loan / Contact Seller.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import { OfferIcon, CalendarIcon, LoanIcon, ChatIcon } from './vdp.icons';

export function SecondaryCTARow() {
  const { t } = useTranslation();
  return (
    <View style={styles.sectionPadded}>
      <View style={styles.secondaryCTAGrid}>
        <TouchableOpacity style={styles.secondaryCTA} activeOpacity={0.8}>
          <OfferIcon />
          <Text style={styles.secondaryCTAText}>{t('vdp.makeAnOffer')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryCTA} activeOpacity={0.8}>
          <CalendarIcon />
          <Text style={styles.secondaryCTAText}>{t('vdp.bookTestDrive')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryCTA} activeOpacity={0.8}>
          <LoanIcon />
          <Text style={styles.secondaryCTAText}>{t('vdp.applyForLoan')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryCTA} activeOpacity={0.8}>
          <ChatIcon />
          <Text style={styles.secondaryCTAText}>{t('vdp.contactSeller')}</Text>
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
  secondaryCTAGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryCTA: {
    flex: 1,
    minWidth: '45%',
    height: 48,
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryCTAText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: slate[700],
  },
});
