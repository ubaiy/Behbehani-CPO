/**
 * Sign-in screen — /auth/sign-in
 *
 * W2 scope (user-locked decision C1):
 *   - Email/password sign-in is the ONLY active method for W2.
 *   - OTP, Google Sign-In, and Apple Sign-In are visible but disabled with
 *     "Coming soon" labels (i18n key: auth.comingSoon).
 *   - Apple Sign-In is App Store mandatory when Google is offered (ARCHITECTURE.md §5).
 *     Both are stubbed here so they are never accidentally removed.
 *   - Sign-up mode is toggled in the same screen; full wire-up deferred to W3.
 *
 * TODO (W2): Wire email+password form to AuthService.signIn({ type: 'email', ... }).
 *   Replace disabled stub buttons with active handlers when API endpoints are live.
 * TODO (W3): Sign-up form submission, T&Cs acceptance, mobile OTP registration.
 */

import { useState } from 'react';
import { View, Text, Pressable, ScrollView, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SignInForm } from '../../src/components/auth/SignInForm';
import { SignUpForm } from '../../src/components/auth/SignUpForm';
import { ComingSoonStubs } from '../../src/components/auth/ComingSoonStubs';
import { LanguageToggle } from '../../src/components/auth/LanguageToggle';
import { screenStyles as styles } from '../../src/components/auth/signInScreenStyles';
import { AuthService } from '../../src/services/auth';

type LoginError = 'ACCOUNT_LOCKED' | 'INVALID_CREDENTIALS' | null;
type ScreenMode = 'signin' | 'signup';

export default function SignInScreen() {
  const { t } = useTranslation();

  // Mode toggle
  const [mode, setMode] = useState<ScreenMode>('signin');

  // Sign-in fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<LoginError>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Sign-up fields
  const [fullName, setFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [mobileDigits, setMobileDigits] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const rtlRow = I18nManager.isRTL ? 'row-reverse' : 'row';

  // Sign-in submit — wired to AuthService.signIn (W2)
  async function handleSignIn() {
    if (loading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setLoginError('INVALID_CREDENTIALS');
      return;
    }

    setLoginError(null);
    setLoading(true);
    try {
      await AuthService.signIn({ type: 'email', email: trimmedEmail, password });
      router.replace('/(tabs)');
    } catch (err) {
      let code: LoginError = 'INVALID_CREDENTIALS';
      const message = err instanceof Error ? err.message : '';
      try {
        const parsed = JSON.parse(message) as { error?: { code?: string } };
        if (parsed?.error?.code === 'ACCOUNT_LOCKED') {
          code = 'ACCOUNT_LOCKED';
        }
      } catch {
        // Non-JSON body — default to INVALID_CREDENTIALS.
      }
      setLoginError(code);
    } finally {
      setLoading(false);
    }
  }

  // Sign-up submit — TODO (W3): wire to AuthService.signUp
  function handleSignUp() {
    // TODO (W3): validate fields, call AuthService.signUp(...)
    console.warn('[sign-in] TODO W3: connect to AuthService.signUp');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top bar */}
      <View style={[styles.topBar, { flexDirection: rtlRow }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => { if (router.canGoBack()) router.back(); }}
          hitSlop={8}
          accessibilityLabel={t('auth.back')}
        >
          <Text style={[styles.backChevron, I18nManager.isRTL && styles.backChevronRTL]}>‹</Text>
        </Pressable>

        <View style={[styles.topBarRight, { flexDirection: rtlRow }]}>
          <LanguageToggle />
          <Pressable hitSlop={8} onPress={() => { /* TODO: skip */ }}>
            <Text style={styles.skipText}>{t('auth.skip')}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand crest */}
        <View style={styles.crestWrapper}>
          <View style={styles.crest}>
            <Text style={styles.crestIcon}>🛡</Text>
          </View>
          <Text style={styles.brandName}>{t('auth.brandName')}</Text>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>
          {mode === 'signin' ? t('auth.welcomeBack') : t('auth.createAccountTitle')}
        </Text>
        <Text style={styles.subheading}>
          {mode === 'signin' ? t('auth.signInSubtitle') : t('auth.joinSubtitle')}
        </Text>

        {mode === 'signin' && (
          <SignInForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            loginError={loginError}
            onSignIn={handleSignIn}
            loading={loading}
          />
        )}

        {mode === 'signup' && (
          <SignUpForm
            fullName={fullName}
            setFullName={setFullName}
            signUpEmail={signUpEmail}
            setSignUpEmail={setSignUpEmail}
            mobileDigits={mobileDigits}
            setMobileDigits={setMobileDigits}
            signUpPassword={signUpPassword}
            setSignUpPassword={setSignUpPassword}
            acceptedTerms={acceptedTerms}
            setAcceptedTerms={setAcceptedTerms}
            onSignUp={handleSignUp}
          />
        )}

        {/* Divider */}
        <View style={[styles.dividerRow, { flexDirection: rtlRow }]}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.dividerOrContinueWith')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <ComingSoonStubs />

        {/* Sign-up / Sign-in toggle link */}
        <Text style={styles.toggleLinkRow}>
          {mode === 'signin' ? t('auth.newToBehbehani') : t('auth.alreadyHaveAccount')}
          <Text
            style={styles.toggleLinkAction}
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setLoginError(null);
            }}
            accessibilityRole="button"
          >
            {mode === 'signin' ? t('auth.createAnAccount') : t('auth.signInInline')}
          </Text>
        </Text>

        {/* Legal */}
        <Text style={styles.legal}>
          {t('auth.legalPrefix')} {mode === 'signin' ? t('auth.signingIn') : t('auth.creatingAnAccount')} {t('auth.legalSuffix')}{' '}
          <Text style={styles.legalLink}>{t('auth.termsOfService')}</Text> {t('auth.legalAnd')}{' '}
          <Text style={styles.legalLink}>{t('auth.privacyPolicy')}</Text>{t('auth.legalPeriod')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
