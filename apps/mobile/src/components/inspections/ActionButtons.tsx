/**
 * ActionButtons — primary (Download PDF) / secondary (Share report) / tertiary
 * (Report an issue) CTAs.
 *
 * Touch targets: primary/secondary 48px, tertiary minHeight 44px.
 */

import { View, Text, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';

interface Props {
  onDownloadPdf: () => void;
  onShare: () => void;
}

export function ActionButtons({ onDownloadPdf, onShare }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.actionsSection}>
      <Pressable
        style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
        onPress={onDownloadPdf}
        accessibilityRole="button"
        accessibilityLabel={t('inspection.actions.downloadPdfA11y')}
      >
        <Text style={styles.btnPrimaryText}>{t('inspection.actions.downloadPdf')}</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnSecondaryPressed]}
        onPress={onShare}
        accessibilityRole="button"
        accessibilityLabel={t('inspection.actions.shareReportA11y')}
      >
        <Text style={styles.btnSecondaryText}>{t('inspection.actions.shareReport')}</Text>
      </Pressable>
      <TouchableOpacity
        onPress={() => console.log('[InspectionReport] Report an issue — TODO')}
        accessibilityRole="button"
        style={styles.btnTertiary}
      >
        <Text style={styles.btnTertiaryText}>{t('inspection.actions.reportIssue')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsSection: { marginHorizontal: 16, marginTop: 20, gap: 10 },
  btnPrimary: {
    height: 48,
    borderRadius: 16,
    backgroundColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryPressed: { backgroundColor: brand[800] },
  btnPrimaryText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 14,
    color: '#FFFFFF',
  },
  btnSecondary: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryPressed: { backgroundColor: brand[50] },
  btnSecondaryText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 14,
    color: brand[700],
  },
  btnTertiary: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingTop: 4 },
  btnTertiaryText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontWeight: '500',
    fontSize: 13,
    color: slate[500],
  },
});
