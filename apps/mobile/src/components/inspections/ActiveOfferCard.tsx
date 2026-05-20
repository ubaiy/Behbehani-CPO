/**
 * ActiveOfferCard — KWD offer card (KWD 3-decimal format), validity line,
 * and "View offer" CTA that navigates to /offers/:token/view.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand } from '../../theme/colors';
import type { MockInspection } from './inspection.types';

interface Props {
  report: MockInspection;
  onViewOffer: () => void;
}

export function ActiveOfferCard({ report, onViewOffer }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.offerCard}>
      <Text style={styles.offerLabel}>{t('inspection.offer.sectionLabel')}</Text>
      <Text style={styles.offerAmount}>{t('inspection.offer.kwdPrefix')} {report.offerAmountKwd}</Text>
      <Text style={styles.offerValidity}>
        {t('inspection.offer.validity', { days: report.offerValidDays, expiry: report.offerExpiry })}
      </Text>
      <View style={styles.offerDivider} />
      <Pressable
        style={({ pressed }) => [styles.offerCta, pressed && styles.offerCtaPressed]}
        onPress={onViewOffer}
        accessibilityRole="button"
        accessibilityLabel={t('inspection.offer.viewOfferA11y')}
      >
        <Text style={styles.offerCtaText}>{t('inspection.offer.viewOffer')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  offerCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 16,
    padding: 16,
  },
  offerLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 10,
    color: brand[600],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  offerAmount: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '800',
    fontSize: 22,
    color: brand[900],
  },
  offerValidity: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontWeight: '400',
    fontSize: 12,
    color: brand[700],
    marginTop: 4,
  },
  offerDivider: { borderTopWidth: 1, borderTopColor: brand[200], marginTop: 12, marginBottom: 12 },
  offerCta: {
    height: 40,
    borderRadius: 12,
    backgroundColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerCtaPressed: { backgroundColor: brand[800] },
  offerCtaText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontWeight: '700',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
