/**
 * IdentityCard — Card 1 of 4 on the profile screen.
 *
 * Covers:
 *   - Avatar display (photo or initials fallback)
 *   - Avatar upload (3-step S3 flow via expo-image-picker)
 *   - Avatar remove (destructive, red border CTA)
 *   - Full name editable input + individual Save button
 *   - Locale toggle (en / ar)
 *
 * Task v0.22.c — mirrors A's web profile Card 1.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
// ─── expo-image-picker require guard ─────────────────────────────────────────
// Wraps the import so this module loads in environments where expo-image-picker
// has not been installed yet (mirrors the pushTokens.ts pattern for
// expo-notifications). Remove the guard once
// `npx expo install expo-image-picker` has been run from apps/mobile/.
// TODO (v0.22.c): Remove guard after expo-image-picker is installed.

interface ImagePickerModule {
  launchImageLibraryAsync(opts: {
    mediaTypes: string;
    quality: number;
    base64: boolean;
    allowsEditing?: boolean;
    aspect?: [number, number];
  }): Promise<{
    canceled: boolean;
    assets: Array<{
      uri: string;
      mimeType?: string;
      fileSize?: number;
    }>;
  }>;
}

let ImagePicker: ImagePickerModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ImagePicker = require('expo-image-picker') as ImagePickerModule;
} catch {
  // Package not installed yet — avatar upload will be disabled.
}
import type { PublicUser } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';
import { meAccountApiClient } from '../../services/http';
import { useQueryClient } from '@tanstack/react-query';

const MAX_BYTES = 500 * 1024; // 500 KB client-side cap

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

interface Props {
  user: PublicUser;
}

export function IdentityCard({ user }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(user.fullName);
  const [isNameSaving, setIsNameSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);

  const isNameDirty = fullName.trim() !== user.fullName && fullName.trim().length > 0;

  const patchCache = useCallback(
    (updated: PublicUser) => {
      queryClient.setQueryData(['me', 'profile'], updated);
      queryClient.setQueryData(['me'], updated);
    },
    [queryClient],
  );

  const handleSaveName = useCallback(async () => {
    if (!isNameDirty) return;
    setIsNameSaving(true);
    try {
      const updated = await meAccountApiClient.updateProfile({
        fullName: fullName.trim(),
      });
      patchCache(updated);
    } catch {
      Alert.alert(t('profile.errorTitle'), t('profile.errorBody'));
    } finally {
      setIsNameSaving(false);
    }
  }, [isNameDirty, fullName, patchCache, t]);

  const handleLocaleChange = useCallback(
    async (locale: 'en' | 'ar') => {
      if (user.locale === locale) return;
      try {
        const updated = await meAccountApiClient.updateProfile({ locale });
        patchCache(updated);
      } catch {
        Alert.alert(t('profile.errorTitle'), t('profile.errorBody'));
      }
    },
    [user.locale, patchCache, t],
  );

  const handleAvatarUpload = useCallback(async () => {
    if (!ImagePicker) {
      Alert.alert('Coming soon', 'Photo upload requires expo-image-picker to be installed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      base64: false,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';

    // Estimate byte size from file size or dimensions (fallback if not provided)
    const fileSizeBytes = asset.fileSize ?? MAX_BYTES;

    if (fileSizeBytes > MAX_BYTES) {
      Alert.alert(t('profile.identity.uploadTooLargeError'));
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Step 1: get presigned URL
      const { uploadUrl, objectKey } = await meAccountApiClient.requestAvatarUploadUrl({
        mimeType,
        fileSizeBytes,
      });

      // Step 2: PUT file bytes to S3
      const blobRes = await fetch(asset.uri);
      const blob = await blobRes.blob();
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': mimeType },
      });
      if (!s3Res.ok) throw new Error(`S3 PUT failed: ${s3Res.status}`);

      // Step 3: confirm avatar → updates profile
      const updated = await meAccountApiClient.confirmAvatar({ objectKey });
      patchCache(updated);
    } catch {
      Alert.alert(t('profile.identity.uploadFailedError'));
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [patchCache, t]);

  const handleRemoveAvatar = useCallback(async () => {
    setIsRemovingAvatar(true);
    try {
      const updated = await meAccountApiClient.removeAvatar();
      patchCache(updated);
    } catch {
      Alert.alert(t('profile.errorTitle'), t('profile.errorBody'));
    } finally {
      setIsRemovingAvatar(false);
    }
  }, [patchCache, t]);

  const isAvatarBusy = isUploadingAvatar || isRemovingAvatar;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('profile.identity.title')}</Text>

      {/* Avatar row */}
      <View style={styles.avatarRow}>
        <View style={styles.avatarWrapper}>
          {user.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={[styles.avatarImage, isAvatarBusy && styles.avatarDim]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatarCircle, isAvatarBusy && styles.avatarDim]}>
              <Text style={styles.avatarInitials}>{getInitials(user.fullName)}</Text>
            </View>
          )}
          {isUploadingAvatar && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.avatarOverlayText}>{t('profile.identity.avatarUploading')}</Text>
            </View>
          )}
        </View>

        <View style={styles.avatarActions}>
          <TouchableOpacity
            style={[styles.avatarBtn, isAvatarBusy && styles.btnDisabled]}
            onPress={handleAvatarUpload}
            disabled={isAvatarBusy}
            accessibilityLabel={t('profile.identity.avatarUploadBtn')}
            accessibilityRole="button"
          >
            <Text style={styles.avatarBtnText}>{t('profile.identity.avatarUploadBtn')}</Text>
          </TouchableOpacity>

          {user.avatarUrl ? (
            <TouchableOpacity
              style={[styles.avatarRemoveBtn, isAvatarBusy && styles.btnDisabled]}
              onPress={handleRemoveAvatar}
              disabled={isAvatarBusy}
              accessibilityLabel={t('profile.identity.avatarRemoveBtn')}
              accessibilityRole="button"
            >
              {isRemovingAvatar ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={styles.avatarRemoveBtnText}>{t('profile.identity.avatarRemoveBtn')}</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Full name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('profile.identity.fullNameLabel')}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('profile.identity.fullNameLabel')}
            placeholderTextColor={slate[400]}
            autoCapitalize="words"
            returnKeyType="done"
            maxLength={120}
            onSubmitEditing={handleSaveName}
            accessibilityLabel={t('profile.identity.fullNameLabel')}
          />
          <TouchableOpacity
            style={[styles.saveBtn, !isNameDirty && styles.saveBtnDisabled]}
            onPress={handleSaveName}
            disabled={!isNameDirty || isNameSaving}
            accessibilityLabel={t('profile.identity.saveCta')}
            accessibilityRole="button"
          >
            {isNameSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{t('profile.identity.saveCta')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Locale toggle */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('profile.identity.localeLabel')}</Text>
        <View style={styles.localeRow}>
          <TouchableOpacity
            style={[styles.localeBtn, user.locale === 'en' && styles.localeBtnActive]}
            onPress={() => handleLocaleChange('en')}
            accessibilityRole="button"
            accessibilityState={{ selected: user.locale === 'en' }}
          >
            <Text style={[styles.localeBtnText, user.locale === 'en' && styles.localeBtnTextActive]}>
              {t('profile.localeEn')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.localeBtn, user.locale === 'ar' && styles.localeBtnActive]}
            onPress={() => handleLocaleChange('ar')}
            accessibilityRole="button"
            accessibilityState={{ selected: user.locale === 'ar' }}
          >
            <Text style={[styles.localeBtnText, user.locale === 'ar' && styles.localeBtnTextActive]}>
              {t('profile.localeAr')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingBottom: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: slate[900],
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: brand[100],
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: brand[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '700',
    color: brand[700],
  },
  avatarDim: {
    opacity: 0.5,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  avatarOverlayText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
  avatarActions: {
    flex: 1,
    gap: 8,
  },
  avatarBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: slate[200],
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: slate[700],
  },
  avatarRemoveBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRemoveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  fieldGroup: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: slate[50],
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: slate[900],
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    borderWidth: 1,
    borderColor: slate[200],
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  saveBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    backgroundColor: brand[700],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: slate[200],
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  localeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  localeBtn: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: slate[200],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  localeBtnActive: {
    backgroundColor: brand[700],
    borderColor: brand[700],
  },
  localeBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: slate[700],
  },
  localeBtnTextActive: {
    color: '#fff',
  },
});
