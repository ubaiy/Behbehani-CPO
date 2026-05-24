/**
 * MobileCard — Card 3 of 4 on the profile screen.
 *
 * Covers:
 *   - Mobile number display with Verified / Not Verified badge
 *   - "Change mobile" CTA → inline panel (no navigation)
 *   - Panel step 1: new mobile input + Send code button
 *   - Panel step 2: 6-digit OTP input + Verify button
 *   - Kuwait mobile validation: starts with 5/6/9, 8 digits
 *   - Success: updates cache + closes panel
 *
 * Task v0.22.c — mirrors A's web profile Card 3.
 * Endpoints:
 *   POST /v1/public/me/mobile           → { otpId, expiresAt }
 *   POST /v1/public/me/mobile/verify    → PublicUser
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { PublicUser } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';
import { meAccountApiClient } from '../../services/http';
import { isValidKuwaitMobile } from '../auth/authConstants';

type PanelState =
  | { open: false }
  | { open: true; step: 'form' }
  | { open: true; step: 'otp'; newMobile: string; otpId: string };

interface Props {
  user: PublicUser;
}

export function MobileCard({ user }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [panel, setPanel] = useState<PanelState>({ open: false });
  const [newMobile, setNewMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchCache = useCallback(
    (updated: PublicUser) => {
      queryClient.setQueryData(['me', 'profile'], updated);
      queryClient.setQueryData(['me'], updated);
    },
    [queryClient],
  );

  const openPanel = useCallback(() => {
    setError(null);
    setNewMobile('');
    setOtpCode('');
    setPanel({ open: true, step: 'form' });
  }, []);

  const closePanel = useCallback(() => {
    setPanel({ open: false });
    setError(null);
  }, []);

  // Strip leading +965 / 965 prefix for validation; digits only
  const mobileDigits = newMobile.replace(/^\+?965/, '').replace(/\D/g, '');
  const isMobileValid = isValidKuwaitMobile(mobileDigits);
  const showFormatHint = newMobile.trim().length >= 3 && !isMobileValid;

  const handleSendCode = useCallback(async () => {
    if (!isMobileValid) return;
    setError(null);
    setIsSending(true);
    // Normalise to E.164-style Kuwait number
    const normalised = `+965${mobileDigits}`;
    try {
      const res = await meAccountApiClient.sendMobileVerificationCode({ newMobile: normalised });
      setOtpCode('');
      setPanel({ open: true, step: 'otp', newMobile: normalised, otpId: res.otpId });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 429) {
        setError(t('profile.errors.rateLimited'));
      } else {
        setError(t('profile.errors.network'));
      }
    } finally {
      setIsSending(false);
    }
  }, [isMobileValid, mobileDigits, t]);

  const handleVerify = useCallback(async () => {
    if (panel.open === false || panel.step !== 'otp') return;
    const code = otpCode.trim();
    if (code.length < 6) return;
    setError(null);
    setIsVerifying(true);
    try {
      const updated = await meAccountApiClient.verifyMobileChange({
        newMobile: panel.newMobile,
        code,
      });
      patchCache(updated);
      closePanel();
      Alert.alert(t('profile.mobile.successTitle'), t('profile.mobile.successBody'));
    } catch (err: unknown) {
      const errCode = (err as { response?: { data?: { code?: string } } }).response?.data?.code;
      if (errCode === 'ME_OTP_INVALID') {
        setError(t('profile.errors.incorrect'));
        setOtpCode('');
      } else {
        setError(t('profile.errors.network'));
      }
    } finally {
      setIsVerifying(false);
    }
  }, [panel, otpCode, patchCache, closePanel, t]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('profile.mobile.title')}</Text>

      {/* Mobile display row */}
      <View style={styles.displayRow}>
        <Text style={styles.valueText}>{user.mobile ?? '—'}</Text>
        {user.mobileVerifiedAt ? (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>{t('profile.mobile.verifiedPill')}</Text>
          </View>
        ) : user.mobile ? (
          <View style={styles.unverifiedBadge}>
            <Text style={styles.unverifiedBadgeText}>{t('profile.mobile.notVerifiedPill')}</Text>
          </View>
        ) : null}
        {!panel.open ? (
          <TouchableOpacity
            style={styles.changeBtn}
            onPress={openPanel}
            accessibilityRole="button"
            accessibilityLabel={t('profile.mobile.changeBtn')}
          >
            <Text style={styles.changeBtnText}>{t('profile.mobile.changeBtn')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Inline panel */}
      {panel.open ? (
        <View style={styles.panel}>
          {panel.step === 'form' ? (
            <>
              <Text style={styles.panelLabel}>{t('profile.mobile.newMobileLabel')}</Text>
              <View style={styles.panelInputRow}>
                <TextInput
                  style={styles.panelInput}
                  value={newMobile}
                  onChangeText={setNewMobile}
                  placeholder={t('profile.mobile.newMobilePlaceholder')}
                  placeholderTextColor={slate[400]}
                  keyboardType="phone-pad"
                  returnKeyType="send"
                  onSubmitEditing={handleSendCode}
                  accessibilityLabel={t('profile.mobile.newMobileLabel')}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!isMobileValid || isSending) && styles.sendBtnDisabled]}
                  onPress={handleSendCode}
                  disabled={!isMobileValid || isSending}
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.mobile.sendCodeBtn')}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.sendBtnText}>{t('profile.mobile.sendCodeBtn')}</Text>
                  )}
                </TouchableOpacity>
              </View>
              {showFormatHint ? (
                <Text style={styles.errorText} accessibilityRole="alert">
                  {t('profile.mobile.formatHint')}
                </Text>
              ) : error ? (
                <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.cancelLink}
                onPress={closePanel}
                accessibilityRole="button"
              >
                <Text style={styles.cancelLinkText}>{t('profile.mobile.cancelCta')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.panelCaption}>{t('profile.mobile.codeCaption')}</Text>
              <View style={styles.panelInputRow}>
                <TextInput
                  style={[styles.panelInput, styles.otpInput]}
                  value={otpCode}
                  onChangeText={(v) => setOtpCode(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="······"
                  placeholderTextColor={slate[400]}
                  keyboardType="number-pad"
                  maxLength={6}
                  textContentType="oneTimeCode"
                  returnKeyType="done"
                  onSubmitEditing={handleVerify}
                  accessibilityLabel={t('profile.mobile.codeLabel')}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (otpCode.length < 6 || isVerifying) && styles.sendBtnDisabled]}
                  onPress={handleVerify}
                  disabled={otpCode.length < 6 || isVerifying}
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.mobile.verifyBtn')}
                >
                  {isVerifying ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.sendBtnText}>{t('profile.mobile.verifyBtn')}</Text>
                  )}
                </TouchableOpacity>
              </View>
              {error ? (
                <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.cancelLink}
                onPress={closePanel}
                accessibilityRole="button"
              >
                <Text style={styles.cancelLinkText}>{t('profile.mobile.cancelCta')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand[100],
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: slate[900],
    marginBottom: 12,
  },
  displayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  valueText: {
    fontSize: 15,
    color: slate[700],
    flexShrink: 1,
  },
  verifiedBadge: {
    backgroundColor: brand[50],
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: brand[700],
  },
  unverifiedBadge: {
    backgroundColor: brand[50],
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unverifiedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: brand[600],
  },
  changeBtn: {
    marginLeft: 'auto',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: slate[700],
  },
  panel: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: brand[100],
    backgroundColor: brand[50],
  },
  panelLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: slate[700],
    marginBottom: 8,
  },
  panelCaption: {
    fontSize: 13,
    fontWeight: '600',
    color: slate[900],
    marginBottom: 10,
  },
  panelInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  panelInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: slate[900],
    borderWidth: 1,
    borderColor: slate[200],
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 4,
    maxWidth: 140,
  },
  sendBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    backgroundColor: brand[700],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: slate[300],
  },
  sendBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#DC2626',
  },
  cancelLink: {
    marginTop: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  cancelLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: brand[700],
  },
});
