/**
 * BookConfirmationToast — success card shown after successful booking submission.
 * Displays bookingRef (e.g. BMC-CON-001234) and SMS confirmation note.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import { fontFamily } from '../../theme/theme';

interface BookConfirmationToastProps {
  bookingRef: string;
}

export function BookConfirmationToast({ bookingRef }: BookConfirmationToastProps) {
  const { t } = useTranslation();
  return (
    <View style={ss.card}>
      <View style={ss.confirmBanner}>
        <Text style={ss.confirmBannerText}>{t('sell.confirmation.banner')}</Text>
      </View>
      <View style={ss.confirmBody}>
        <Text style={ss.confirmRefLabel}>{t('sell.confirmation.refLabel')}</Text>
        <Text style={ss.confirmRefValue}>{bookingRef}</Text>
        <Text style={ss.confirmSmsNote}>{t('sell.confirmation.smsNote')}</Text>
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: slate[200],
    padding: 16,
    gap: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  confirmBanner: {
    backgroundColor: brand[700],
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: fontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  confirmBody: { gap: 6, paddingTop: 4 },
  confirmRefLabel: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
    color: brand[700],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  confirmRefValue: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    color: brand[900],
    letterSpacing: 0.5,
  },
  confirmSmsNote: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: brand[900],
    lineHeight: 18,
  },
});
