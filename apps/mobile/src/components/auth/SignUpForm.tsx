import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily, spacing, radius } from '../../theme/theme'; // radius used by inputWrapper/mobilePrefix/primaryButton/checkbox styles
import {
  SLATE_50, SLATE_200, SLATE_400, SLATE_700, SLATE_900,
  BRAND_900, RED_500,
  computePasswordStrength, isValidKuwaitMobile,
} from './authConstants';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { TermsCheckbox } from './TermsCheckbox';

interface Props {
  fullName: string;
  setFullName: (v: string) => void;
  signUpEmail: string;
  setSignUpEmail: (v: string) => void;
  mobileDigits: string;
  setMobileDigits: (v: string) => void;
  signUpPassword: string;
  setSignUpPassword: (v: string) => void;
  acceptedTerms: boolean;
  setAcceptedTerms: (v: boolean) => void;
  onSignUp: () => void;
}

export function SignUpForm({
  fullName, setFullName,
  signUpEmail, setSignUpEmail,
  mobileDigits, setMobileDigits,
  signUpPassword, setSignUpPassword,
  acceptedTerms, setAcceptedTerms,
  onSignUp,
}: Props) {
  const { t } = useTranslation();
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const rtlRow = I18nManager.isRTL ? 'row-reverse' : 'row';

  const passwordStrength = computePasswordStrength(signUpPassword);
  const mobileValid = mobileDigits.length === 8 && isValidKuwaitMobile(mobileDigits);

  return (
    <View style={styles.form}>
      {/* Full name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('auth.fullName')}</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIconText}>👤</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('auth.fullNamePlaceholder')}
            placeholderTextColor={SLATE_400}
            textContentType="name"
            autoCapitalize="words"
            accessibilityLabel={t('auth.fullName')}
          />
        </View>
      </View>

      {/* Email */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('auth.emailLabel')}</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIconText}>✉</Text>
          <TextInput
            style={styles.input}
            value={signUpEmail}
            onChangeText={setSignUpEmail}
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

      {/* Kuwait mobile */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('auth.kuwaitMobile')}</Text>
        <View style={[
          styles.inputWrapper,
          !mobileValid && mobileDigits.length > 0 && styles.inputWrapperError,
        ]}>
          <View style={styles.mobilePrefix}>
            <Text style={styles.mobilePrefixText}>+965</Text>
          </View>
          <TextInput
            style={[styles.input, styles.inputWithLeadingWide]}
            value={mobileDigits}
            onChangeText={(v) => setMobileDigits(v.replace(/\D/g, '').slice(0, 8))}
            placeholder={t('auth.kuwaitMobilePlaceholder')}
            placeholderTextColor={SLATE_400}
            keyboardType="number-pad"
            textContentType="telephoneNumber"
            maxLength={8}
            accessibilityLabel={t('auth.kuwaitMobileA11y')}
          />
        </View>
        <Text style={styles.hintText}>{t('auth.kuwaitMobileHint')}</Text>
      </View>

      {/* Create password */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('auth.createPassword')}</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIconText}>🔒</Text>
          <TextInput
            style={[styles.input, styles.inputWithTrailing]}
            value={signUpPassword}
            onChangeText={setSignUpPassword}
            placeholder={t('auth.createPasswordPlaceholder')}
            placeholderTextColor={SLATE_400}
            secureTextEntry={!showSignUpPassword}
            textContentType="newPassword"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t('auth.createPassword')}
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowSignUpPassword((v) => !v)}
            accessibilityLabel={showSignUpPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            hitSlop={8}
          >
            <Text style={styles.eyeIcon}>{showSignUpPassword ? '🙈' : '👁'}</Text>
          </Pressable>
        </View>
        {signUpPassword.length > 0 && <PasswordStrengthMeter strength={passwordStrength} />}
      </View>

      {/* T&Cs checkbox */}
      <TermsCheckbox accepted={acceptedTerms} onToggle={() => setAcceptedTerms(!acceptedTerms)} />

      {/* Primary CTA */}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
          !acceptedTerms && styles.primaryButtonDisabled,
        ]}
        onPress={onSignUp}
        disabled={!acceptedTerms}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>{t('auth.createAccount')}</Text>
      </Pressable>
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
  inputWrapperError: {
    borderColor: RED_500,
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
  inputWithLeadingWide: {
    paddingStart: spacing[2],
  },
  mobilePrefix: {
    width: 56,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderEndWidth: 1,
    borderEndColor: SLATE_200,
  },
  mobilePrefixText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: SLATE_700,
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
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
  },
  hintText: {
    fontSize: 10,
    fontFamily: fontFamily.regular,
    color: SLATE_700,
    marginTop: 4,
  },
});
