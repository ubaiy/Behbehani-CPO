/**
 * ReportCtaDisabled — disabled "Report available with your offer" placeholder CTA.
 *
 * Per v1.5-D5 lesson: A's interim fix was null + disabled CTA with
 * "Report available with your offer" copy that lights up when B extends the DTO
 * with an inspection report ID.
 *
 * This component is ALWAYS disabled until DTO surfaces inspectionReportId (or
 * equivalent field). Mobile mirrors A's defensive nullable handling.
 *
 * When B extends the DTO, replace the `disabled` prop source with the actual
 * report navigation and remove this placeholder comment.
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { slate } from '../../theme/colors';

export function ReportCtaDisabled() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {t('sellTracker.reportCta.label', 'INSPECTION REPORT')}
      </Text>
      {/* Always disabled — v1.5-D5 carry-over. Lights up when B surfaces reportId in DTO. */}
      <TouchableOpacity
        style={styles.disabledBtn}
        disabled
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        accessibilityLabel={t(
          'sellTracker.reportCta.disabledA11y',
          'Report not yet available',
        )}
      >
        <Text style={styles.disabledBtnText}>
          {t('sellTracker.reportCta.disabledCopy', 'Report available with your offer')}
        </Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        {t(
          'sellTracker.reportCta.hint',
          'Your inspection report will be shared once Behbehani issues your cash offer.',
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: slate[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: slate[200],
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: slate[500],
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  disabledBtn: {
    minHeight: 48,
    borderRadius: 9999,
    backgroundColor: slate[200],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    opacity: 0.7,
  },
  disabledBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: slate[500],
    textAlign: 'center',
  },
  hint: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: slate[500],
    lineHeight: 16,
    textAlign: 'center',
  },
});
