/**
 * ComingSoonPill — option (c) per v1.3.6 §1.
 * bg-slate-100 + brand-700 text + brand-200 border.
 */

import { View, Text, StyleSheet } from 'react-native';
import { brand, slate } from '../../theme/colors';

interface Props {
  label?: string;
}

export function ComingSoonPill({ label = 'COMING Q3 2026' }: Props) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
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
