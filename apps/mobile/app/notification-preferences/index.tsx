/**
 * Notification Preferences screen — /notification-preferences
 *
 * Task v0.22.a — per-cell notification preference grid (categories × channels).
 *
 * Categories: bookingUpdates, listingAlerts, marketing, accountSecurity (locked).
 * Channels: push, email, sms.
 *
 * Wired to:
 *   GET   /v1/public/me/notification-preferences
 *   PATCH /v1/public/me/notification-preferences
 *
 * UX pattern: auto-save per toggle (debounced 500ms) + optimistic update with
 * rollback on error. "Save changes" sticky bottom CTA also provided (enabled
 * while dirty, matching web's pattern).
 *
 * Mobile layout: card-per-category with 3 channel toggles per card.
 * accountSecurity card is permanently "on" and locked.
 *
 * Hard constraints:
 *   • No red — this screen has no destructive actions
 *   • Touch targets ≥ 44px per toggle row, ≥ 48px CTA
 *   • accountSecurity is z.literal(true) — must always be sent as true
 *   • DON'T touch notifications.* namespace (inbox) — this is notificationPrefs.*
 */

import { useCallback, useRef, useState } from 'react';
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
import type { NotificationPreferencesDto } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../src/theme/colors';
import { meNotificationPrefsApiClient } from '../../src/services/http';
import { PreferenceCard } from '../../src/components/notification-prefs';
import type { Channel } from '../../src/components/notification-prefs';

// ─── Types ────────────────────────────────────────────────────────────────────

type MutableCategory = 'bookingUpdates' | 'listingAlerts' | 'marketing';

/** Per-cell grid: each (category × channel) coordinate is independent. */
type CellGrid = Record<MutableCategory, Record<Channel, boolean>>;

// ─── Grid helpers ─────────────────────────────────────────────────────────────

function buildCellGrid(prefs: NotificationPreferencesDto): CellGrid {
  const cats: MutableCategory[] = ['bookingUpdates', 'listingAlerts', 'marketing'];
  const chs: Channel[] = ['push', 'email', 'sms'];
  const grid = {} as CellGrid;
  for (const cat of cats) {
    grid[cat] = { push: false, email: false, sms: false };
    for (const ch of chs) {
      grid[cat][ch] = prefs.channels[ch] && prefs.categories[cat];
    }
  }
  return grid;
}

function gridToPrefs(
  grid: CellGrid,
  base: NotificationPreferencesDto,
): NotificationPreferencesDto {
  const cats: MutableCategory[] = ['bookingUpdates', 'listingAlerts', 'marketing'];
  const chs: Channel[] = ['push', 'email', 'sms'];
  const channels = { ...base.channels };
  const categories = { ...base.categories };
  for (const ch of chs) {
    channels[ch] = cats.some((cat) => grid[cat][ch]);
  }
  for (const cat of cats) {
    categories[cat] = chs.some((ch) => grid[cat][ch]);
  }
  return { channels, categories };
}

function cloneCellGrid(grid: CellGrid): CellGrid {
  return {
    bookingUpdates: { ...grid.bookingUpdates },
    listingAlerts: { ...grid.listingAlerts },
    marketing: { ...grid.marketing },
  };
}

function deepEqualGrid(a: CellGrid, b: CellGrid): boolean {
  const cats: MutableCategory[] = ['bookingUpdates', 'listingAlerts', 'marketing'];
  const chs: Channel[] = ['push', 'email', 'sms'];
  for (const cat of cats) {
    for (const ch of chs) {
      if (a[cat][ch] !== b[cat][ch]) return false;
    }
  }
  return true;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationPreferencesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [cellGrid, setCellGrid] = useState<CellGrid | null>(null);
  const [baselineGrid, setBaselineGrid] = useState<CellGrid | null>(null);
  const [baselinePrefs, setBaselinePrefs] = useState<NotificationPreferencesDto | null>(null);
  const [showToast, setShowToast] = useState(false);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDirty =
    cellGrid && baselineGrid ? !deepEqualGrid(cellGrid, baselineGrid) : false;

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const { isLoading, isError, refetch } = useQuery<NotificationPreferencesDto, Error>({
    queryKey: ['me', 'notification-preferences'],
    queryFn: () => meNotificationPrefsApiClient.get(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    select: (prefs) => {
      // On first load (no local state), seed the grid from server data.
      if (!cellGrid) {
        const grid = buildCellGrid(prefs);
        setCellGrid(grid);
        setBaselineGrid(grid);
        setBaselinePrefs(prefs);
      }
      return prefs;
    },
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (dto: NotificationPreferencesDto) =>
      meNotificationPrefsApiClient.update(dto),
    onSuccess: (updatedPrefs) => {
      const newGrid = buildCellGrid(updatedPrefs);
      setCellGrid(newGrid);
      setBaselineGrid(newGrid);
      setBaselinePrefs(updatedPrefs);
      void queryClient.invalidateQueries({ queryKey: ['me', 'notification-preferences'] });
      triggerToast();
    },
    onError: () => {
      // Rollback: restore the grid to the last saved baseline.
      if (baselineGrid) {
        setCellGrid(cloneCellGrid(baselineGrid));
      }
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const triggerToast = () => {
    setShowToast(true);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setShowToast(false), 3000);
  };

  const handleToggle = useCallback(
    (cat: MutableCategory, channel: Channel) => {
      if (!cellGrid || !baselinePrefs) return;

      const nextGrid = cloneCellGrid(cellGrid);
      nextGrid[cat][channel] = !nextGrid[cat][channel];
      setCellGrid(nextGrid);

      // Debounced auto-save (500ms).
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      debounceTimeout.current = setTimeout(() => {
        const dto = gridToPrefs(nextGrid, baselinePrefs);
        saveMutation.mutate(dto);
      }, 500);
    },
    [cellGrid, baselinePrefs, saveMutation],
  );

  const handleSave = useCallback(() => {
    if (!cellGrid || !baselinePrefs || !isDirty) return;
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    const dto = gridToPrefs(cellGrid, baselinePrefs);
    saveMutation.mutate(dto);
  }, [cellGrid, baselinePrefs, isDirty, saveMutation]);

  // ─── i18n labels ────────────────────────────────────────────────────────────

  const channelLabels: Record<Channel, string> = {
    push: t('notificationPrefs.channelPush'),
    email: t('notificationPrefs.channelEmail'),
    sms: t('notificationPrefs.channelSms'),
  };

  const ROWS: { cat: MutableCategory | 'accountSecurity'; labelKey: string; locked: boolean }[] = [
    { cat: 'bookingUpdates', labelKey: 'notificationPrefs.categoryBookingUpdates', locked: false },
    { cat: 'listingAlerts', labelKey: 'notificationPrefs.categoryListingAlerts', locked: false },
    { cat: 'marketing', labelKey: 'notificationPrefs.categoryMarketing', locked: false },
    { cat: 'accountSecurity', labelKey: 'notificationPrefs.categoryAccountSecurity', locked: true },
  ];

  const lockedValues: Record<Channel, boolean> = { push: true, email: true, sms: true };

  // ─── Render ─────────────────────────────────────────────────────────────────

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
        <Text style={styles.headerTitle}>{t('notificationPrefs.title')}</Text>
        {saveMutation.isPending && (
          <ActivityIndicator size="small" color={brand[700]} style={{ marginLeft: 8 }} />
        )}
      </View>

      {/* Loading */}
      {isLoading && !cellGrid && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={brand[700]} />
        </View>
      )}

      {/* Error */}
      {isError && !cellGrid && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('notificationPrefs.errorBody')}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void refetch()}
            accessibilityRole="button"
          >
            <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {cellGrid && (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 100 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Blurb */}
            <Text style={styles.blurb}>{t('notificationPrefs.blurb')}</Text>

            {/* Preference cards */}
            {ROWS.map((row) => {
              if (row.locked) {
                return (
                  <PreferenceCard
                    key={row.cat}
                    categoryLabel={t(row.labelKey)}
                    locked
                    values={lockedValues}
                    onToggle={() => {}}
                    disabled={false}
                    channelLabels={channelLabels}
                    lockedLabel={t('notificationPrefs.lockedLabel')}
                  />
                );
              }
              const cat = row.cat as MutableCategory;
              return (
                <PreferenceCard
                  key={cat}
                  categoryLabel={t(row.labelKey)}
                  locked={false}
                  values={cellGrid[cat]}
                  onToggle={(channel) => handleToggle(cat, channel)}
                  disabled={saveMutation.isPending}
                  channelLabels={channelLabels}
                  lockedLabel={t('notificationPrefs.lockedLabel')}
                />
              );
            })}

            <Text style={styles.caption}>{t('notificationPrefs.applyCaption')}</Text>
          </ScrollView>

          {/* Sticky save CTA */}
          <View
            style={[styles.stickyFooter, { paddingBottom: 12 + insets.bottom }]}
          >
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (!isDirty || saveMutation.isPending) && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={!isDirty || saveMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel={t('notificationPrefs.saveBtn')}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {isDirty
                    ? t('notificationPrefs.saveBtn')
                    : t('notificationPrefs.savedLabel')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Auto-saved toast */}
      {showToast && (
        <View
          style={[styles.toast, { bottom: 80 + insets.bottom }]}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={t('notificationPrefs.autoSavedToast')}
        >
          <Text style={styles.toastText}>{t('notificationPrefs.autoSavedToast')}</Text>
        </View>
      )}
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
    paddingTop: 16,
    gap: 4,
  },
  blurb: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: slate[500],
    lineHeight: 18,
    marginBottom: 12,
  },
  caption: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: slate[400],
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    lineHeight: 16,
  },
  stickyFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: slate[100],
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  saveBtn: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: brand[700],
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: brand[900],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  toastText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
