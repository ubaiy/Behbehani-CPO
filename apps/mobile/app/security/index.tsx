/**
 * Security screen — /security
 *
 * Task v0.22.a — active sessions list + sign-out-all.
 *
 * Wired to:
 *   GET    /v1/public/me/sessions          — list active sessions
 *   DELETE /v1/public/me/sessions/:id      — revoke a single session
 *   POST   /v1/public/me/sign-out-all      — revoke all other sessions
 *
 * 6 states: loading skeleton / error+retry / list / revoking (per-session) /
 *           sign-out-all confirm modal / signing-out-all.
 *
 * Hard constraints:
 *   • Red ONLY for destructive (revoke, sign-out-all) — brand[700/900] + slate palette
 *   • Touch targets ≥ 44px, CTA ≥ 48px
 *   • No change-password UI yet (deferred — screen doesn't exist on mobile)
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { SessionListResponse } from '@behbehani-cpo/data-access-mobile';
import { brand, slate } from '../../src/theme/colors';
import { meSessionsApiClient } from '../../src/services/http';
import { SessionListItem, SignOutAllConfirmModal } from '../../src/components/security';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SecurityScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [signOutAllModalVisible, setSignOutAllModalVisible] = useState(false);
  const [revokingIds, setRevokingIds] = useState<Set<string>>(new Set());

  // ─── Data fetching ────────────────────────────────────────────────────────

  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<SessionListResponse, Error>({
      queryKey: ['me', 'sessions'],
      queryFn: () => meSessionsApiClient.list(),
      staleTime: 30_000,
    });

  const sessions = data?.items ?? [];

  // ─── Mutations ────────────────────────────────────────────────────────────

  const revokeMutation = useMutation({
    mutationFn: (id: string) => meSessionsApiClient.revoke(id),
    onMutate: (id: string) => {
      setRevokingIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    onSettled: (_, __, id: string) => {
      setRevokingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: ['me', 'sessions'] });
    },
  });

  const signOutAllMutation = useMutation({
    mutationFn: () => meSessionsApiClient.signOutAll(),
    onSuccess: () => {
      setSignOutAllModalVisible(false);
      void queryClient.invalidateQueries({ queryKey: ['me', 'sessions'] });
    },
    onError: () => {
      setSignOutAllModalVisible(false);
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleRevoke = useCallback(
    (id: string) => {
      revokeMutation.mutate(id);
    },
    [revokeMutation],
  );

  const handleSignOutAllConfirm = useCallback(() => {
    signOutAllMutation.mutate();
  }, [signOutAllMutation]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Sticky header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('security.title')}</Text>
      </View>

      {/* Loading state */}
      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={brand[700]} />
        </View>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('security.errorBody')}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void refetch()}
            accessibilityRole="button"
          >
            <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sessions list */}
      {!isLoading && !isError && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 32 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Active sessions section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t('security.sessionsHeading')}
              </Text>
              {isFetching && (
                <ActivityIndicator size="small" color={brand[700]} />
              )}
            </View>
            <View style={styles.sessionList}>
              {sessions.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>
                    {t('security.sessionsEmpty')}
                  </Text>
                </View>
              ) : (
                sessions.map((session) => (
                  <SessionListItem
                    key={session.id}
                    session={session}
                    isRevoking={revokingIds.has(session.id)}
                    onRevoke={handleRevoke}
                    labels={{
                      thisDevice: t('security.currentSessionBadge'),
                      revokeBtn: t('security.revokeBtn'),
                      revokingBtn: t('security.revokingBtn'),
                      unknownDevice: t('security.unknownDevice'),
                    }}
                  />
                ))
              )}
            </View>
          </View>

          {/* Sign out everywhere CTA */}
          <TouchableOpacity
            style={styles.signOutAllBtn}
            onPress={() => setSignOutAllModalVisible(true)}
            disabled={signOutAllMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel={t('security.signOutAllBtn')}
          >
            {signOutAllMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.signOutAllBtnText}>
                {t('security.signOutAllBtn')}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Sign-out-all confirm modal */}
      <SignOutAllConfirmModal
        visible={signOutAllModalVisible}
        isLoading={signOutAllMutation.isPending}
        onCancel={() => setSignOutAllModalVisible(false)}
        onConfirm={handleSignOutAllConfirm}
        labels={{
          title: t('security.signOutAllConfirmTitle'),
          body: t('security.signOutAllConfirmBody'),
          cancelBtn: t('common.cancel'),
          confirmBtn: t('security.signOutAllConfirmCta'),
          confirmingBtn: t('security.signingOutAllBtn'),
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: slate[200],
    gap: 10,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 20,
    color: brand[700],
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: slate[900],
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  errorText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: slate[500],
    textAlign: 'center',
  },
  retryBtn: {
    minHeight: 48,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: brand[700],
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: slate[100],
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: slate[100],
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: slate[900],
  },
  sessionList: {
    // each SessionListItem has its own bottom border
  },
  emptyRow: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: slate[500],
  },
  signOutAllBtn: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  signOutAllBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
