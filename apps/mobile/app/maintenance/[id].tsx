/**
 * Maintenance detail — /maintenance/:id
 *
 * Task v0.19.b — customer-facing maintenance pickup request detail view.
 *
 * Displays:
 *   • Vehicle (freeText or listingId reference)
 *   • Governorate (localised via t('maintenance.governorate.<snake_case_wire_value>'))
 *   • Pickup address line
 *   • Preferred date + window
 *   • Concern category + notes
 *   • Status pill
 *   • Admin notes (if set)
 *   • Scheduled for (if set)
 *
 * Cancel CTA: only when status === 'pending_review'.
 *   On 409 MAINTENANCE_REQUEST_NOT_CANCELLABLE → show alert + refetch.
 * Edit CTA: only when status === 'pending_review'.
 *
 * Hard constraints:
 *   • Touch targets >= 44px, CTAs >= 48px
 *   • Red ONLY for Cancel (destructive)
 *   • No green
 */

import { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { MaintenanceRequestDto } from '@behbehani-cpo/shared-types';
import { AxiosError } from 'axios';
import { brand, slate, red } from '../../src/theme/colors';
import { meMaintenanceApiClient } from '../../src/services/http';
import { MaintenanceStatusPill, CancelConfirmModal } from '../../src/components/maintenance';

export default function MaintenanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);

  const {
    data: item,
    isLoading,
    isError,
    refetch,
  } = useQuery<MaintenanceRequestDto, Error>({
    queryKey: ['maintenance', 'detail', id],
    queryFn: () => meMaintenanceApiClient.getById(id),
    staleTime: 30_000,
    enabled: !!id,
  });

  const { mutate: cancelRequest, isPending: isCancelling } = useMutation({
    mutationFn: () => meMaintenanceApiClient.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['maintenance'] });
      router.back();
    },
    onError: (err) => {
      const axiosErr = err as AxiosError<{ error?: { code?: string } }>;
      const code = axiosErr.response?.data?.error?.code;
      if (code === 'MAINTENANCE_REQUEST_NOT_CANCELLABLE') {
        Alert.alert(
          t('maintenance.detail.errorNotCancellable'),
          '',
          [{ text: t('common.cancel'), style: 'cancel' }],
        );
        void refetch();
      } else {
        Alert.alert(t('common.error'));
      }
    },
  });

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <DetailHeader />
        <View style={styles.center}>
          <ActivityIndicator color={brand[700]} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────────

  if (isError || !item) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <DetailHeader />
        <View style={styles.center}>
          <Text style={styles.errorText}>{t('maintenance.detail.error')}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void refetch()}
            accessibilityRole="button"
          >
            <Text style={styles.retryBtnText}>{t('maintenance.list.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canEdit = item.status === 'pending_review';
  const canCancel = item.status === 'pending_review';

  const governorateLabel = t(`maintenance.governorate.${item.governorate}`, {
    defaultValue: item.governorate,
  });
  const windowLabel = t(`maintenance.window.${item.preferredWindow}`, {
    defaultValue: item.preferredWindow,
  });
  const categoryLabel = t(`maintenance.concern.${item.concernCategory}`, {
    defaultValue: item.concernCategory,
  });

  const vehicleLabel = item.vehicleFreeText ?? '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DetailHeader />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.eyebrow}>
              {`#${item.id.slice(-6).toUpperCase()}`}
            </Text>
            <MaintenanceStatusPill status={item.status} />
          </View>
        </View>

        {/* Vehicle */}
        <View style={styles.card}>
          <Row label={t('maintenance.form.vehicleLabel')} value={vehicleLabel} />
        </View>

        {/* Location */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {t('maintenance.form.governorateLabel')}
          </Text>
          <Row label={t('maintenance.form.governorateLabel')} value={governorateLabel} />
          <Row
            label={t('maintenance.form.pickupAddressLabel')}
            value={item.pickupAddressLine}
          />
        </View>

        {/* Schedule */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {t('maintenance.form.preferredDateLabel')}
          </Text>
          <Row label={t('maintenance.form.preferredDateLabel')} value={item.preferredDate} />
          <Row label={t('maintenance.form.preferredWindowLabel')} value={windowLabel} />
          {item.scheduledFor ? (
            <Row
              label={t('maintenance.detail.scheduledFor')}
              value={new Date(item.scheduledFor).toLocaleDateString('en-KW', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            />
          ) : null}
        </View>

        {/* Concern */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {t('maintenance.form.concernCategoryLabel')}
          </Text>
          <Row label={t('maintenance.form.concernCategoryLabel')} value={categoryLabel} />
          <View style={styles.notesGroup}>
            <Text style={styles.rowLabel}>{t('maintenance.form.concernNotesLabel')}</Text>
            <Text style={styles.notesValue}>{item.concernNotes}</Text>
          </View>
        </View>

        {/* Admin notes */}
        {item.adminNotes ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('maintenance.detail.adminNotesLabel')}</Text>
            <Text style={styles.notesValue}>{item.adminNotes}</Text>
          </View>
        ) : null}

        {/* Action buttons */}
        {(canEdit || canCancel) ? (
          <View style={styles.actionsCard}>
            {canEdit ? (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  // Edit route: navigate to new screen pre-filled (future sprint)
                  Alert.alert(t('maintenance.detail.editBtn'));
                }}
                accessibilityRole="button"
              >
                <Text style={styles.editBtnText}>{t('maintenance.detail.editBtn')}</Text>
              </TouchableOpacity>
            ) : null}
            {canCancel ? (
              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  (!canCancel || isCancelling) && styles.cancelBtnDisabled,
                ]}
                onPress={() => setShowCancel(true)}
                disabled={!canCancel || isCancelling}
                accessibilityRole="button"
              >
                <Text style={styles.cancelBtnText}>
                  {isCancelling
                    ? t('common.loading')
                    : t('maintenance.detail.cancelBtn')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <CancelConfirmModal
        visible={showCancel}
        onDismiss={() => setShowCancel(false)}
        onConfirm={() => {
          setShowCancel(false);
          cancelRequest();
        }}
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailHeader() {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backText}>{'‹'}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('maintenance.detail.title')}</Text>
      <View style={styles.backButton} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: slate[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: slate[200],
    minHeight: 56,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 28,
    color: brand[700],
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 32,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: slate[900],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: slate[700],
    textAlign: 'center',
  },
  retryBtn: {
    minHeight: 48,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: brand[900],
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: brand[700],
    letterSpacing: 0.4,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: -4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  rowLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: slate[500],
    flex: 1,
  },
  rowValue: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: slate[900],
    flex: 2,
    textAlign: 'right',
  },
  notesGroup: {
    gap: 4,
  },
  notesValue: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: slate[700],
    lineHeight: 20,
  },
  actionsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  editBtn: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: brand[700],
  },
  cancelBtn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: red[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnDisabled: {
    opacity: 0.5,
  },
  cancelBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
