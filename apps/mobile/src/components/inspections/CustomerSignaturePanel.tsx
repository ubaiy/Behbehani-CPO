/**
 * CustomerSignaturePanel — two states:
 *   - Awaiting signature: slate-tinted card + "Sign remotely via link" CTA (44px row).
 *   - Signed: brand-tinted card with customer name, signed-at, and method.
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import type { MockInspection } from './inspection.types';

interface Props {
  signed: boolean;
  report: MockInspection;
  onSignNow: () => void;
}

export function CustomerSignaturePanel({ signed, report, onSignNow }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.sigSection}>
      <Text style={styles.sigSectionLabel}>{t('inspection.signature.sectionLabel')}</Text>

      {!signed ? (
        /* Awaiting state */
        <View style={styles.sigAwaitingCard}>
          <View style={styles.sigIconWrap}>
            <Text style={styles.sigAwaitingIcon}>{'ℹ'}</Text>
          </View>
          <View style={styles.sigBody}>
            <Text style={styles.sigAwaitingTitle}>{t('inspection.signature.awaitingTitle')}</Text>
            <Text style={styles.sigAwaitingText}>
              {t('inspection.signature.awaitingText')}
            </Text>
            <TouchableOpacity
              onPress={onSignNow}
              accessibilityRole="link"
              style={styles.signNowRow}
            >
              <Text style={styles.signNowText}>{t('inspection.signature.signRemoteLink')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Signed state */
        <View style={styles.sigConfirmedCard}>
          <View style={styles.sigConfirmedIconWrap}>
            <Text style={styles.sigConfirmedIcon}>✓</Text>
          </View>
          <View style={styles.sigBody}>
            <Text style={styles.sigConfirmedTitle}>
              Signed by {report.customerName}
            </Text>
            <Text style={styles.sigConfirmedMeta}>
              {report.customerSignedAt ?? 'Mon 19 May 16:48'} · {report.signatureMethod}
            </Text>
            <Text style={styles.sigConfirmedCaption}>
              {t('inspection.signature.confirmedCaption')}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sigSection: { marginHorizontal: 16, marginTop: 20 },
  sigSectionLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 11,
    color: slate[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 12,
  },
  sigAwaitingCard: {
    backgroundColor: slate[100],
    borderWidth: 1,
    borderColor: slate[300],
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sigIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: slate[200],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  sigAwaitingIcon: { fontSize: 16, color: slate[500] },
  sigBody: { flex: 1 },
  sigAwaitingTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 13,
    color: slate[700],
  },
  sigAwaitingText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 12,
    color: slate[600],
    marginTop: 4,
    lineHeight: 18,
  },
  signNowRow: { marginTop: 8, minHeight: 44, justifyContent: 'center' },
  signNowText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    color: brand[700],
  },
  sigConfirmedCard: {
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sigConfirmedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  sigConfirmedIcon: { fontSize: 16, color: '#FFFFFF', fontWeight: '700' },
  sigConfirmedTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 13,
    color: brand[800],
  },
  sigConfirmedMeta: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 11,
    color: brand[600],
    marginTop: 2,
  },
  sigConfirmedCaption: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 11,
    color: slate[500],
    marginTop: 4,
  },
});
