/**
 * OverallScoreCard — circular score gauge (react-native-svg arc) + verdict pill
 * + pass/advisory/fail count row + total checks.
 *
 * Red-500 ONLY for failed count dot.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';
import { brand, slate } from '../../theme/colors';
import { RED_500 } from './inspection.types';
import type { MockInspection } from './inspection.types';

interface Props {
  report: MockInspection;
}

const GAUGE_SIZE = 112;
const GAUGE_STROKE = 8;
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

export function OverallScoreCard({ report }: Props) {
  const { t } = useTranslation();
  const pct = Math.max(0, Math.min(1, report.overallScore / 100));
  // Brand 700 for high scores (>= 80, the CPO threshold), brand 600 below
  const arcColor = report.overallScore >= 80 ? brand[700] : brand[600];
  const dashOffset = GAUGE_CIRCUMFERENCE * (1 - pct);
  return (
    <View style={styles.scoreCard}>
      <View style={styles.scoreRow}>
        {/* Circular gauge — react-native-svg arc proportional to overallScore/100 */}
        <View
          style={styles.gaugeWrapper}
          accessibilityLabel={t('inspection.score.gaugeA11y', { score: report.overallScore })}
        >
          <Svg
            width={GAUGE_SIZE}
            height={GAUGE_SIZE}
            viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
            style={styles.gaugeSvg}
          >
            {/* Track */}
            <Circle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={GAUGE_RADIUS}
              stroke={slate[200]}
              strokeWidth={GAUGE_STROKE}
              fill="none"
            />
            {/* Progress arc — rotated -90° so it starts at the top */}
            <Circle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={GAUGE_RADIUS}
              stroke={arcColor}
              strokeWidth={GAUGE_STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${GAUGE_CIRCUMFERENCE} ${GAUGE_CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
            />
          </Svg>
          <View style={styles.gaugeInner} pointerEvents="none">
            <Text style={styles.gaugeScore}>{report.overallScore}</Text>
            <Text style={styles.gaugeCaption}>{t('inspection.score.outOf')}</Text>
          </View>
        </View>
        <View style={styles.verdictBlock}>
          <View style={styles.verdictPill}>
            <Text style={styles.verdictText}>{report.verdict}</Text>
          </View>
          <View style={styles.countsRow}>
            <View style={styles.countItem}>
              <View style={[styles.countDot, { backgroundColor: brand[700] }]} />
              <Text style={styles.countLabel}>
                <Text style={styles.countNumber}>{report.passCount}</Text>
                {t('inspection.score.passLabel')}
              </Text>
            </View>
            <View style={styles.countItem}>
              <View style={[styles.countDot, { backgroundColor: slate[400] }]} />
              <Text style={styles.countLabel}>
                <Text style={styles.countNumber}>{report.advisoryCount}</Text>
                {t('inspection.score.advisoryLabel')}
              </Text>
            </View>
            <View style={styles.countItem}>
              <View style={[styles.countDot, { backgroundColor: RED_500 }]} />
              <Text style={styles.countLabel}>
                <Text style={styles.countNumber}>{report.failCount}</Text>
                {t('inspection.score.failLabel')}
              </Text>
            </View>
          </View>
          <Text style={styles.totalChecks}>
            {t('inspection.score.totalChecks', { count: report.totalChecks })}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  // Circular gauge: react-native-svg arc, score text overlaid via absolute positioning
  gaugeWrapper: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  gaugeSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gaugeInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
  },
  gaugeScore: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '800',
    fontSize: 28,
    color: slate[900],
    lineHeight: 32,
  },
  gaugeCaption: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontWeight: '500',
    fontSize: 10,
    color: slate[400],
    marginTop: 2,
  },
  verdictBlock: { flex: 1, gap: 8 },
  verdictPill: {
    alignSelf: 'flex-start',
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  verdictText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 12,
    color: brand[700],
  },
  countsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countDot: { width: 8, height: 8, borderRadius: 4 },
  countLabel: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 12,
    color: slate[700],
  },
  countNumber: { fontWeight: '700' },
  totalChecks: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 10,
    color: slate[400],
  },
});
