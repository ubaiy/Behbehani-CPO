/**
 * MonthlyCalculator — down-payment discrete steps + tenure chips + KWD monthly output.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import { TENURE_OPTIONS } from './vdp.helpers';

interface MonthlyCalculatorProps {
  priceFils: string;
  downPct: number;
  tenure: 24 | 36 | 48 | 60;
  downKWD: number;
  monthlyEst: string;
  onDownPctChange: (pct: number) => void;
  onTenureChange: (mo: 24 | 36 | 48 | 60) => void;
}

export function MonthlyCalculator({
  downPct,
  tenure,
  downKWD,
  monthlyEst,
  onDownPctChange,
  onTenureChange,
}: MonthlyCalculatorProps) {
  return (
    <View style={styles.sectionPadded}>
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeading}>Finance this car</Text>
          <TouchableOpacity>
            <Text style={styles.linkText}>Full calculator</Text>
          </TouchableOpacity>
        </View>

        {/* Down payment */}
        <Text style={styles.calcLabel}>Down payment</Text>
        <View style={styles.calcDownRow}>
          <Text style={styles.calcDownValue}>
            KWD {downKWD.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
          </Text>
          <Text style={styles.calcDownPct}>({downPct}%)</Text>
        </View>
        {/* Slider row — discrete steps 0 / 10 / 20 / 30 */}
        <View style={styles.sliderRow}>
          {[0, 10, 20, 30].map((pct) => (
            <TouchableOpacity
              key={pct}
              style={[styles.sliderPip, downPct === pct ? styles.sliderPipActive : null]}
              onPress={() => onDownPctChange(pct)}
            >
              <Text style={[styles.sliderPipText, downPct === pct ? styles.sliderPipTextActive : null]}>
                {pct}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tenure chips */}
        <Text style={styles.calcLabel}>Tenure</Text>
        <View style={styles.tenureRow}>
          {TENURE_OPTIONS.map((mo) => (
            <TouchableOpacity
              key={mo}
              style={[styles.tenureChip, tenure === mo ? styles.tenureChipActive : null]}
              onPress={() => onTenureChange(mo)}
            >
              <Text style={[styles.tenureChipText, tenure === mo ? styles.tenureChipTextActive : null]}>
                {mo} mo
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Result */}
        <View style={styles.calcResult}>
          <View>
            <Text style={styles.calcResultLabel}>Estimated monthly</Text>
            <Text style={styles.calcResultValue}>KWD {monthlyEst}</Text>
          </View>
          <Text style={styles.calcResultNote}>
            {downPct}% down{'\n'}6.5% APR · {tenure} mo
          </Text>
        </View>
        <Text style={styles.calcDisclaimer}>Final rate subject to bank approval</Text>
        <TouchableOpacity style={styles.applyLoanBtn} activeOpacity={0.8}>
          <Text style={styles.applyLoanBtnText}>Apply for Loan</Text>
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
  linkText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: brand[700],
  },
  calcLabel: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
    color: slate[700],
    marginBottom: 6,
    marginTop: 8,
  },
  calcDownRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 8,
  },
  calcDownValue: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: brand[800],
  },
  calcDownPct: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: slate[400],
  },
  sliderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  sliderPip: {
    flex: 1,
    height: 36,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: slate[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderPipActive: {
    backgroundColor: brand[50],
    borderColor: brand[300],
  },
  sliderPipText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: slate[600],
  },
  sliderPipTextActive: {
    fontFamily: fontFamily.semiBold,
    color: brand[800],
  },
  tenureRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  tenureChip: {
    flex: 1,
    height: 36,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: slate[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenureChipActive: {
    backgroundColor: brand[50],
    borderColor: brand[300],
  },
  tenureChipText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: slate[600],
  },
  tenureChipTextActive: {
    fontFamily: fontFamily.semiBold,
    color: brand[800],
  },
  calcResult: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: slate[100],
    paddingTop: 12,
    marginTop: 4,
  },
  calcResultLabel: {
    fontSize: 11,
    color: slate[500],
    fontFamily: fontFamily.regular,
  },
  calcResultValue: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    color: brand[800],
    lineHeight: 26,
  },
  calcResultNote: {
    fontSize: 11,
    color: slate[400],
    textAlign: 'right',
    fontFamily: fontFamily.regular,
  },
  calcDisclaimer: {
    fontSize: 11,
    color: slate[400],
    fontFamily: fontFamily.regular,
    marginTop: 6,
    textAlign: 'center',
  },
  applyLoanBtn: {
    marginTop: 10,
    height: 40,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: brand[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyLoanBtnText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: brand[800],
  },
});
