import { View, Text, StyleSheet, I18nManager } from 'react-native';
import { fontFamily, spacing, radius } from '../../theme/theme';
import {
  SLATE_200,
  SLATE_500,
  PasswordStrength,
  strengthColor,
} from './authConstants';

interface Props {
  strength: PasswordStrength;
}

export function PasswordStrengthMeter({ strength }: Props) {
  const rtlRow = I18nManager.isRTL ? 'row-reverse' : 'row';
  const levels: PasswordStrength[] = ['weak', 'fair', 'good', 'strong'];

  return (
    <>
      <View style={[styles.strengthBar, { flexDirection: rtlRow }]}>
        {levels.map((level, i) => {
          const filled = levels.indexOf(strength) >= i;
          return (
            <View
              key={level}
              style={[
                styles.strengthSegment,
                { backgroundColor: filled ? strengthColor(strength) : SLATE_200 },
              ]}
            />
          );
        })}
      </View>
      <Text style={styles.hintText}>
        Strength:{' '}
        <Text style={[styles.hintBold, { color: strengthColor(strength) }]}>
          {strength.charAt(0).toUpperCase() + strength.slice(1)}
        </Text>
        {strength !== 'strong' && ' · Add a symbol for Strong'}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  strengthBar: {
    gap: 4,
    marginTop: spacing[2],
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: radius.full,
  },
  hintText: {
    fontSize: 10,
    fontFamily: fontFamily.regular,
    color: SLATE_500,
    marginTop: 4,
  },
  hintBold: {
    fontFamily: fontFamily.semiBold,
  },
});
