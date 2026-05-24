/**
 * Profile screen — /profile
 *
 * Task v0.22.c — 4-card layout mirroring A's web profile.component.ts.
 *
 * Cards:
 *   1. IdentityCard — avatar upload/remove + full name + locale toggle
 *   2. EmailCard    — email display + change/verify OTP flow
 *   3. MobileCard   — mobile display + change/verify OTP flow
 *   4. PasswordCard — set/change password + strength meter
 *
 * Chrome: sticky header + back button (mobile pattern — each screen owns its
 * chrome, no persistent shell like web). Sticky CTA removed — each card has
 * its own individual save action.
 */

import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { PublicUser } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../src/theme/colors';
import { meAccountApiClient } from '../../src/services/http';
import {
  IdentityCard,
  EmailCard,
  MobileCard,
  PasswordCard,
} from '../../src/components/profile';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, isError } = useQuery<PublicUser>({
    queryKey: ['me', 'profile'],
    queryFn: () => meAccountApiClient.getProfile(),
    staleTime: 60_000,
  });

  const handleCancel = useCallback(() => {
    router.back();
  }, []);

  // ─── Loading ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator size="large" color={brand[700]} />
      </SafeAreaView>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────

  if (isError || !profile) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <Text style={styles.errorText}>{t('profile.loadError')}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => queryClient.invalidateQueries({ queryKey: ['me', 'profile'] })}
          accessibilityRole="button"
        >
          <Text style={styles.retryBtnText}>{t('profile.retry')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Sticky header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.headerCancel}
          accessibilityLabel={t('profile.cancel')}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.headerCancelText}>{t('profile.cancel')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Card 1 — Identity */}
        <IdentityCard user={profile} />

        {/* Card 2 — Email */}
        <EmailCard user={profile} />

        {/* Card 3 — Mobile */}
        <MobileCard user={profile} />

        {/* Card 4 — Password */}
        <PasswordCard user={profile} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: slate[100],
    backgroundColor: '#FFFFFF',
  },
  headerCancel: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerCancelText: {
    fontSize: 16,
    color: brand[700],
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: slate[900],
  },
  headerSpacer: {
    minWidth: 60,
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  // Error / loading
  errorText: {
    fontSize: 16,
    color: slate[600],
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: 24,
    backgroundColor: brand[700],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
