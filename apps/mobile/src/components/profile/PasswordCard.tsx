/**
 * PasswordCard — Card 4 of 4 on the profile screen.
 *
 * Covers:
 *   - "Change password" CTA when user.hasPassword, "Set password" when not
 *   - Inline panel: current password (only when hasPassword) + new password
 *     + PasswordStrengthMeter (reused from auth/) + confirm + submit
 *   - Validation: passwords match, strength >= 'good' (score 2+)
 *   - Success: closes panel + success toast
 *
 * Task v0.22.c — mirrors A's web profile Card 4.
 * Endpoint: POST /v1/public/me/password → 204
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
import type { PublicUser } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';
import { meAccountApiClient } from '../../services/http';
import {
  computePasswordStrength,
  type PasswordStrength,
} from '../auth/authConstants';
import { PasswordStrengthMeter } from '../auth/PasswordStrengthMeter';

interface Props {
  user: PublicUser;
}

export function PasswordCard({ user }: Props) {
  const { t } = useTranslation();

  const [panelOpen, setPanelOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength: PasswordStrength = newPw ? computePasswordStrength(newPw) : 'weak';

  // Mirror A's logic: strength >= 2 ('good' or 'strong') required
  const strengthScore = ['weak', 'fair', 'good', 'strong'].indexOf(strength);
  const isStrengthOk = strengthScore >= 2;
  const hasCurrentIfNeeded = !user.hasPassword || currentPw.length > 0;
  const canSubmit = hasCurrentIfNeeded && newPw.length >= 8 && newPw === confirmPw && isStrengthOk;

  const openPanel = useCallback(() => {
    setError(null);
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setShowCurrentPw(false);
    setShowNewPw(false);
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    if (newPw !== confirmPw) {
      setError(t('profile.password.mismatchError'));
      return;
    }
    if (!isStrengthOk) {
      setError(t('profile.password.weakError'));
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await meAccountApiClient.changePassword({
        ...(user.hasPassword && currentPw ? { currentPassword: currentPw } : {}),
        newPassword: newPw,
      });
      closePanel();
      Alert.alert(t('profile.password.successTitle'), t('profile.password.successBody'));
    } catch {
      setError(t('profile.errors.network'));
    } finally {
      setIsSaving(false);
    }
  }, [canSubmit, newPw, confirmPw, isStrengthOk, user.hasPassword, currentPw, closePanel, t]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('profile.password.title')}</Text>

      {!panelOpen ? (
        <TouchableOpacity
          style={styles.openBtn}
          onPress={openPanel}
          accessibilityRole="button"
          accessibilityLabel={user.hasPassword ? t('profile.password.changeCta') : t('profile.password.setCta')}
        >
          <Text style={styles.openBtnText}>
            {user.hasPassword ? t('profile.password.changeCta') : t('profile.password.setCta')}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.panel}>
          {/* Current password — only shown when user already has one */}
          {user.hasPassword ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.panelLabel}>{t('profile.password.currentLabel')}</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  value={currentPw}
                  onChangeText={setCurrentPw}
                  secureTextEntry={!showCurrentPw}
                  placeholder="••••••••"
                  placeholderTextColor={slate[400]}
                  textContentType="password"
                  autoComplete="current-password"
                  returnKeyType="next"
                  accessibilityLabel={t('profile.password.currentLabel')}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPw((v) => !v)}
                  style={styles.eyeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={showCurrentPw ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  <Text style={styles.eyeBtnText}>{showCurrentPw ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* New password + strength meter */}
          <View style={styles.fieldGroup}>
            <Text style={styles.panelLabel}>{t('profile.password.newLabel')}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                value={newPw}
                onChangeText={setNewPw}
                secureTextEntry={!showNewPw}
                placeholder="••••••••"
                placeholderTextColor={slate[400]}
                textContentType="newPassword"
                autoComplete="new-password"
                returnKeyType="next"
                accessibilityLabel={t('profile.password.newLabel')}
              />
              <TouchableOpacity
                onPress={() => setShowNewPw((v) => !v)}
                style={styles.eyeBtn}
                accessibilityRole="button"
                accessibilityLabel={showNewPw ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                <Text style={styles.eyeBtnText}>{showNewPw ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            {newPw.length > 0 ? <PasswordStrengthMeter strength={strength} /> : null}
          </View>

          {/* Confirm password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.panelLabel}>{t('profile.password.confirmLabel')}</Text>
            <TextInput
              style={[
                styles.passwordInput,
                styles.passwordInputFull,
                confirmPw.length > 0 && newPw !== confirmPw && styles.inputError,
              ]}
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={slate[400]}
              textContentType="newPassword"
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              accessibilityLabel={t('profile.password.confirmLabel')}
            />
          </View>

          {error ? (
            <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
          ) : null}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.submitBtn, (!canSubmit || isSaving) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit || isSaving}
              accessibilityRole="button"
              accessibilityLabel={t('profile.password.submitBtn')}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>{t('profile.password.submitBtn')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={closePanel}
              disabled={isSaving}
              accessibilityRole="button"
            >
              <Text style={styles.cancelBtnText}>{t('profile.password.cancelCta')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  openBtn: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: slate[700],
  },
  panel: {
    gap: 0,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  panelLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: slate[700],
    marginBottom: 6,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: slate[200],
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingRight: 4,
    minHeight: 44,
  },
  passwordInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: slate[900],
  },
  passwordInputFull: {
    borderWidth: 1,
    borderColor: slate[200],
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  eyeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeBtnText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  submitBtn: {
    minHeight: 48,
    flex: 1,
    backgroundColor: brand[700],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: slate[300],
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  cancelBtn: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: slate[700],
  },
});
