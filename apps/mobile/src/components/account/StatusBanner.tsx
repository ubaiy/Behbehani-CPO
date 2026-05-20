/**
 * StatusBanner — shown only when user.status !== 'active'.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { brand } from '../../theme/colors';
import type { CustomerStatus } from '@behbehani-cpo/shared-types';

interface Props {
  status: CustomerStatus;
  onVerify: () => void;
}

export function StatusBanner({ status, onVerify }: Props) {
  if (status === 'active') return null;

  return (
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{'🛡'}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Account status: {status.replace('_', ' ')}</Text>
        <Text style={styles.subtext}>Verify your email address to fully activate your account.</Text>
      </View>
      <Pressable style={styles.cta} onPress={onVerify}>
        <Text style={styles.ctaText}>Verify</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: brand[50],
    borderWidth: 1,
    borderColor: brand[200],
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    flexShrink: 0,
  },
  icon: {
    fontSize: 20,
    color: brand[700],
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600',
    fontSize: 13,
    color: brand[800],
  },
  subtext: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '400',
    fontSize: 11,
    color: brand[700],
    marginTop: 2,
  },
  cta: {
    flexShrink: 0,
    backgroundColor: brand[700],
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    fontSize: 11,
    color: '#FFFFFF',
  },
});
