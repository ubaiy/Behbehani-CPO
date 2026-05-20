/**
 * InspectorNotesCard — brand-tinted card with inspector notes, "Read more",
 * and the inspector sign-off row (name + title + signed-at timestamp).
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import type { MockInspection } from './inspection.types';

interface Props {
  report: MockInspection;
}

export function InspectorNotesCard({ report }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.notesCard}>
      <Text style={styles.notesLabel}>{t('inspection.notes.sectionLabel')}</Text>
      <Text style={styles.notesText} numberOfLines={4}>
        {report.inspectorNotes}
      </Text>
      <TouchableOpacity
        onPress={() => console.log('[InspectionReport] Read more — TODO expand')}
        accessibilityRole="button"
      >
        <Text style={styles.readMoreLink}>{t('inspection.notes.readMore')}</Text>
      </TouchableOpacity>
      <View style={styles.notesDivider} />
      <View style={styles.inspectorSignRow}>
        <View>
          <Text style={styles.inspectorName}>{report.inspectorName}</Text>
          <Text style={styles.inspectorTitle}>
            {report.inspectorTitle} · {t('inspection.notes.inspectorOrg')}
          </Text>
        </View>
        <View style={styles.signedAt}>
          <Text style={styles.signedAtLabel}>{t('inspection.notes.signedLabel')}</Text>
          <Text style={styles.signedAtTime}>{report.inspectorSignedAt}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notesCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 16,
    padding: 16,
  },
  notesLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 10,
    color: brand[700],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  notesText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 13,
    color: slate[700],
    fontStyle: 'italic',
    lineHeight: 20,
  },
  readMoreLink: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    color: brand[700],
    marginTop: 4,
  },
  notesDivider: { borderTopWidth: 1, borderTopColor: brand[200], marginTop: 12, marginBottom: 12 },
  inspectorSignRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  inspectorName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 13,
    color: brand[800],
  },
  inspectorTitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 11,
    color: brand[600],
    marginTop: 2,
  },
  signedAt: { alignItems: 'flex-end' },
  signedAtLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontWeight: '500',
    fontSize: 10,
    color: brand[600],
  },
  signedAtTime: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 10,
    color: slate[500],
  },
});
