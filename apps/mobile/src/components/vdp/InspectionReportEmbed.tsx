/**
 * InspectionReportEmbed — overall score gauge + 5-category breakdown.
 * Extracted from apps/mobile/app/listings/[slug].tsx
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';
import { ShieldIcon } from './vdp.icons';
import { InspectionCategory } from './vdp.types';

const GAUGE_SIZE = 56;
const GAUGE_STROKE = 4;
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

const rtlChevron = I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : {};

interface InspBarProps {
  category: InspectionCategory;
}

function InspBar({ category }: InspBarProps) {
  const { t } = useTranslation();
  const pct = category.maxScore > 0 ? category.score / category.maxScore : 0;
  return (
    <View style={styles.inspBarWrapper}>
      <View style={styles.inspBarHeader}>
        <Text style={styles.inspBarName}>{category.name}</Text>
        <Text style={styles.inspBarScore}>
          {t('vdp.inspBarMaxOf', { score: category.score, max: category.maxScore })}
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
  const { t } = useTranslation();
  return (
    <View style={styles.sectionPadded}>
      <View style={[styles.card, styles.inspCard]}>
        <View style={styles.inspHeaderRow}>
          <View style={styles.inspTitleBlock}>
            <View style={styles.inspIconBox}>
              <ShieldIcon size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.inspTitle}>{t('vdp.behbehaniInspectionTitle')}</Text>
              <Text style={styles.inspDate}>
                {inspectionDate ? t('vdp.completedDate', { date: inspectionDate }) : t('vdp.completed')}
              </Text>
            </View>
          </View>
          {/* Score gauge — react-native-svg arc */}
          <View
            style={styles.gaugeWrapper}
            accessibilityLabel={t('vdp.inspectionScoreA11y', { score: inspScore })}
          >
            <Svg
              width={GAUGE_SIZE}
              height={GAUGE_SIZE}
              viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
              style={styles.gaugeSvg}
            >
              <Circle
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={GAUGE_RADIUS}
                stroke={brand[100]}
                strokeWidth={GAUGE_STROKE}
                fill="none"
              />
              <Circle
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={GAUGE_RADIUS}
                stroke={brand[800]}
                strokeWidth={GAUGE_STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${GAUGE_CIRCUMFERENCE} ${GAUGE_CIRCUMFERENCE}`}
                strokeDashoffset={GAUGE_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, inspGaugePct)))}
                transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
              />
            </Svg>
            <View style={styles.gaugeCenter} pointerEvents="none">
              <Text style={styles.gaugeScore}>{inspScore}</Text>
              <Text style={styles.gaugeMax}>{t('vdp.inspGaugeMaxLabel')}</Text>
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
          <Text style={styles.inspOutlineBtnText}>{t('vdp.viewFullReport')}</Text>
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
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gaugeSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gaugeCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
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
