import { View, Text, StyleSheet, Pressable, I18nManager } from 'react-native';
import { fontFamily, spacing, radius } from '../../theme/theme';
import { SLATE_300, SLATE_700, BRAND_700 } from './authConstants';

interface Props {
  accepted: boolean;
  onToggle: () => void;
}

export function TermsCheckbox({ accepted, onToggle }: Props) {
  const rtlRow = I18nManager.isRTL ? 'row-reverse' : 'row';

  return (
    <Pressable
      style={[styles.checkboxRow, { flexDirection: rtlRow }]}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: accepted }}
    >
      <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
        {accepted && <Text style={styles.checkboxTick}>✓</Text>}
      </View>
      <Text style={styles.checkboxLabel}>
        I agree to the{' '}
        <Text style={styles.linkText}>Terms of Service</Text>
        {' '}and{' '}
        <Text style={styles.linkText}>Privacy Policy</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkboxRow: {
    alignItems: 'flex-start',
    gap: spacing[3],
    minHeight: 44,
    paddingVertical: spacing[2],
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: SLATE_300,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: BRAND_700,
    borderColor: BRAND_700,
  },
  checkboxTick: {
    fontSize: 11,
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    lineHeight: 14,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: SLATE_700,
    lineHeight: 20,
  },
  linkText: {
    fontFamily: fontFamily.semiBold,
    color: BRAND_700,
  },
});
