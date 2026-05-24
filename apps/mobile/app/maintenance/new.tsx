/**
 * New maintenance request — /maintenance/new (modal presentation)
 *
 * Task v0.19.b — customer-facing maintenance pickup creation form.
 *
 * Wired to POST /v1/public/me/maintenance-requests via meMaintenanceApiClient.
 * Idempotency-Key header is generated per-attempt via newIdempotencyKey().
 *
 * On success: invalidates the maintenance list cache + navigates back.
 *
 * Hard constraints (Task v0.19.b):
 *   • Idempotency-Key REQUIRED on POST create — use newIdempotencyKey()
 *   • Governorate wire value is snake_case — ESPECIALLY mubarak_al_kabeer
 *   • Touch targets >= 44px, CTAs >= 48px
 *   • Brand + slate palette only, no green
 *   • All user-visible strings via t()
 */

import { Alert, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { CreateMaintenanceRequestInput } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../src/theme/colors';
import { meMaintenanceApiClient } from '../../src/services/http';
import { newIdempotencyKey } from '../../src/components/orders/orders.utils';
import { MaintenanceForm } from '../../src/components/maintenance';

export default function MaintenanceNewScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { mutate: createRequest, isPending } = useMutation({
    mutationFn: (input: CreateMaintenanceRequestInput) =>
      meMaintenanceApiClient.create(input, newIdempotencyKey()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['maintenance'] });
      // Navigate back to the list — modal dismisses to caller
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(
          '/maintenance' as Parameters<typeof router.replace>[0],
        );
      }
    },
    onError: () => {
      Alert.alert(t('common.error'));
    },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
          }}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.closeText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('maintenance.form.title')}</Text>
        <View style={styles.closeButton} />
      </View>

      {/* Form */}
      <MaintenanceForm
        isSubmitting={isPending}
        onSubmit={(input) => createRequest(input)}
      />
    </SafeAreaView>
  );
}

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
  closeButton: {
    minWidth: 60,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  closeText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 15,
    color: brand[700],
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: slate[900],
  },
});
