/**
 * InspectionReportEmbed — overall score gauge + 5-category breakdown.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import { ShieldIcon } from './vdp.icons';
import { InspectionCategory } from './vdp.types';

const rtlChevron = I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : {};

interface InspBarProps {
  category: InspectionCategory;
}

function InspBar({ category }: InspBarProps) {
  const pct = category.maxScore > 0 ? category.score / category.maxScore : 0;
  return (
    <View style={styles.inspBarWrapper}>
      <View style={styles.inspBarHeader}>
        <Text style={styles.inspBarName}>{category.name}</Text>
        <Text style={styles.inspBarScore}>
          {category.score} / {category.maxScore}
        </Text>
      </View>
      <View style={styles.inspBarTrack}>
        <View style={[styles.inspBarFill, { width: `${Math.round(pct * 100)}%` as any }]} />
      </View>
    </View>
  );
}

interface InspectionReportEmbedProps {
  inspScore: number;
  inspGaugePct: number;
  inspCategories: InspectionCategory[];
  inspectionDate?: string;
  onViewFullReport: () => void;
}

export function InspectionReportEmbed({
  inspScore,
  inspGaugePct,
  inspCategories,
  inspectionDate,
  onViewFullReport,
}: InspectionReportEmbedProps) {
  return (
    <View style={styles.sectionPadded}>
      <View style={[styles.card, styles.inspCard]}>
        <View style={styles.inspHeaderRow}>
          <View style={styles.inspTitleBlock}>
            <View style={styles.inspIconBox}>
              <ShieldIcon size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.inspTitle}>Al Daman inspection</Text>
              <Text style={styles.inspDate}>
                {inspectionDate ? `Completed ${inspectionDate}` : 'Completed'}
              </Text>
            </View>
          </View>
          {/* Score gauge */}
          <View style={styles.gaugeWrapper}>
            <View style={styles.gaugeOuter}>
              <View
                style={[
                  styles.gaugeArc,
                  {
                    borderColor: brand[800],
                    // Approximate arc via opacity — full arc shown for simplicity
                    // A true SVG gauge would need react-native-svg
                    opacity: inspGaugePct,
                  },
                ]}
              />
            </View>
            <View style={styles.gaugeCenter}>
              <Text style={styles.gaugeScore}>{inspScore}</Text>
              <Text style={styles.gaugeMax}>/ 100</Text>
            </View>
          </View>
        </View>
        {inspCategories.map((cat) => (
          <InspBar key={cat.name} category={cat} />
        ))}
        <TouchableOpacity
          style={[styles.outlineBtn, styles.inspOutlineBtn]}
          onPress={onViewFullReport}
          activeOpacity={0.8}
        >
          <Text style={styles.inspOutlineBtnText}>View full report</Text>
          <Text style={[styles.chevronSmall, { color: brand[800] }, rtlChevron]}>›</Text>
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
  inspCard: {
    borderColor: brand[200],
    backgroundColor: brand[50],
  },
  inspHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inspTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  inspIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: brand[800],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inspTitle: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: slate[900],
  },
  inspDate: {
    fontSize: 11,
    color: slate[600],
    marginTop: 1,
  },
  gaugeWrapper: {
    width: 56,
    height: 56,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gaugeOuter: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: brand[100],
  },
  gaugeArc: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderTopColor: brand[800],
    borderRightColor: brand[800],
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
  },
  gaugeCenter: {
    alignItems: 'center',
  },
  gaugeScore: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: brand[800],
    lineHeight: 16,
  },
  gaugeMax: {
    fontSize: 8,
    fontFamily: fontFamily.semiBold,
    color: slate[500],
    textTransform: 'uppercase',
  },
  inspBarWrapper: {
    marginBottom: 8,
  },
  inspBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  inspBarName: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
    color: slate[700],
  },
  inspBarScore: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    color: brand[800],
  },
  inspBarTrack: {
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    overflow: 'hidden',
  },
  inspBarFill: {
    height: 6,
    backgroundColor: brand[700],
    borderRadius: 999,
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
  inspOutlineBtn: {
    borderColor: brand[200],
  },
  inspOutlineBtnText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: brand[800],
  },
  chevronSmall: {
    fontSize: 16,
    color: brand[700],
    lineHeight: 18,
  },
});
