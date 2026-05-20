import { View, Text, StyleSheet, I18nManager } from 'react-native';
import { fontFamily, spacing, radius } from '../../theme/theme';
import { RED_50, RED_200, RED_500, RED_600, RED_700 } from './authConstants';

export function AccountLockoutBanner() {
  const rtlRow = I18nManager.isRTL ? 'row-reverse' : 'row';

  return (
    <View style={[styles.lockoutBanner, { flexDirection: rtlRow }]}>
      <Text style={styles.lockoutIconText}>🔒</Text>
      <View style={styles.lockoutTextGroup}>
        <Text style={styles.lockoutTitle}>Account temporarily locked</Text>
        <Text style={styles.lockoutBody}>
          Too many failed sign-in attempts. Try again in{' '}
          <Text style={styles.lockoutBold}>10 minutes</Text>, or reset your password.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockoutBanner: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: RED_200,
    backgroundColor: RED_50,
    padding: spacing[3],
    gap: spacing[2],
    alignItems: 'flex-start',
  },
  lockoutIconText: {
    fontSize: 14,
    marginTop: 1,
    color: RED_600,
  },
  lockoutTextGroup: {
    flex: 1,
  },
  lockoutTitle: {
    fontSize: 12,
    fontFamily: fontFamily.bold,
    color: RED_700,
  },
  lockoutBody: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: RED_600,
    marginTop: 2,
    lineHeight: 16,
  },
  lockoutBold: {
    fontFamily: fontFamily.bold,
  },
});
