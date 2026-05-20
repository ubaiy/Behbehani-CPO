/**
 * ComingSoonPill — option (c) per v1.3.6 §1.
 * bg-slate-100 + brand-700 text + brand-200 border.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';

interface Props {
  label?: string;
}

export function ComingSoonPill({ label }: Props) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('account.comingSoon.defaultLabel');
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{resolvedLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: slate[100],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    fontSize: 9,
    color: brand[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
