import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, I18nManager } from 'react-native';
import { fontFamily, spacing, radius } from '../../theme/theme';
import { SLATE_50, SLATE_200, SLATE_400, SLATE_700, SLATE_900, BRAND_700, BRAND_900 } from './authConstants';
import { AccountLockoutBanner } from './AccountLockoutBanner';

type LoginError = 'ACCOUNT_LOCKED' | 'INVALID_CREDENTIALS' | null;

interface Props {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loginError: LoginError;
  onSignIn: () => void;
}

export function SignInForm({ email, setEmail, password, setPassword, loginError, onSignIn }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const rtlRow = I18nManager.isRTL ? 'row-reverse' : 'row';

  return (
    <View style={styles.form}>
      {/* Email */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Email</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIconText}>✉</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={SLATE_400}
            textContentType="emailAddress"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Email"
          />
        </View>
      </View>

      {/* Password */}
      <View style={styles.fieldGroup}>
        <View style={[styles.passwordLabelRow, { flexDirection: rtlRow }]}>
          <Text style={styles.fieldLabel}>Password</Text>
          <Pressable
            style={styles.forgotButton}
            onPress={() => {
              // TODO (W2): navigate to forgot-password screen
              console.warn('[sign-in] TODO W2: forgot password navigation');
            }}
            accessibilityRole="button"
            hitSlop={4}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        </View>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIconText}>🔒</Text>
          <TextInput
            style={[styles.input, styles.inputWithTrailing]}
            value={password}
            onChangeText={setPassword}
            placeholder={'••••••••'}
            placeholderTextColor={SLATE_400}
            secureTextEntry={!showPassword}
            textContentType="password"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Password"
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            hitSlop={8}
          >
            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Primary CTA */}
      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
        onPress={onSignIn}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>Sign in</Text>
      </Pressable>

      {loginError === 'ACCOUNT_LOCKED' && <AccountLockoutBanner />}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: spacing[7],
    gap: spacing[3],
  },
  fieldGroup: {
    gap: spacing[1],
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: SLATE_700,
  },
  inputWrapper: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius['2xl'],
    backgroundColor: SLATE_50,
    borderWidth: 1,
    borderColor: SLATE_200,
    overflow: 'hidden',
  },
  inputIconText: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
    color: SLATE_400,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: SLATE_900,
    paddingEnd: spacing[3],
  },
  inputWithTrailing: {
    paddingEnd: 44,
  },
  passwordLabelRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: BRAND_700,
  },
  eyeButton: {
    position: 'absolute',
    end: 0,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 14,
  },
  primaryButton: {
    height: 48,
    borderRadius: radius['2xl'],
    backgroundColor: BRAND_900,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
  },
});
