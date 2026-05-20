import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  loading?: boolean;
}

export function SignInForm({ email, setEmail, password, setPassword, loginError, onSignIn, loading = false }: Props) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const rtlRow = I18nManager.isRTL ? 'row-reverse' : 'row';

  return (
    <View style={styles.form}>
      {/* Email */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('auth.emailLabel')}</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIconText}>✉</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.emailPlaceholder')}
            placeholderTextColor={SLATE_400}
            textContentType="emailAddress"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t('auth.emailLabel')}
          />
        </View>
      </View>

      {/* Password */}
      <View style={styles.fieldGroup}>
        <View style={[styles.passwordLabelRow, { flexDirection: rtlRow }]}>
          <Text style={styles.fieldLabel}>{t('auth.passwordLabel')}</Text>
          <Pressable
            style={styles.forgotButton}
            onPress={() => {
              // TODO (W2): navigate to forgot-password screen
              console.warn('[sign-in] TODO W2: forgot password navigation');
            }}
            accessibilityRole="button"
            hitSlop={4}
          >
            <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
          </Pressable>
        </View>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIconText}>🔒</Text>
          <TextInput
            style={[styles.input, styles.inputWithTrailing]}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor={SLATE_400}
            secureTextEntry={!showPassword}
            textContentType="password"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t('auth.passwordLabel')}
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
            accessibilityLabel={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            hitSlop={8}
            disabled={loading}
          >
            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Primary CTA */}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
          loading && styles.primaryButtonDisabled,
        ]}
        onPress={onSignIn}
        accessibilityRole="button"
        accessibilityState={{ disabled: loading, busy: loading }}
        disabled={loading}
      >
        <Text style={styles.primaryButtonText}>{loading ? t('auth.signInButtonLoading') : t('auth.signInInline')}</Text>
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
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
  },
});
