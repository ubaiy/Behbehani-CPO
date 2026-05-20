import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily, palette, spacing } from '../../theme/theme';

export interface BrowseErrorRetryProps {
  onRetry: () => void;
}

export function BrowseErrorRetry({ onRetry }: BrowseErrorRetryProps) {
  const { t } = useTranslation();
  return (
    <View style={s.errorWrap}>
      <View style={s.errorIcon}>
        <Text style={s.errorIconText}>!</Text>
      </View>
      <Text style={s.errorTitle}>{t('browse.couldNotLoad')}</Text>
      <Text style={s.errorSub}>{t('browse.errorNetwork')}</Text>
      <TouchableOpacity style={s.retryBtn} onPress={onRetry}>
        <Text style={s.retryText}>{t('common.retryShort')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[2],
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: spacing[2],
  },
  errorIconText: {
    fontSize: 22,
    color: '#DC2626',
    fontFamily: fontFamily.bold,
  },
  errorTitle: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: '#B91C1C',
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 13,
    color: '#DC2626',
    fontFamily: fontFamily.regular,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing[2],
    height: 44,
    paddingHorizontal: spacing[5],
    borderRadius: 99,
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: palette.white,
  },
});
