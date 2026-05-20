/**
 * Order detail — /orders/:id (Task #65)
 *
 * Sections:
 *   • Sticky header (back + order ref)
 *   • ReservationCountdown — live timer (visible only for pending statuses)
 *   • OrderSummaryCard  — stock, status pill, totals, reservation timestamps
 *   • StatusTimeline    — 5-step progress strip
 *   • PaymentSummaryCard — payments[] from the order detail DTO
 *   • VehicleCard       — stock + masked-VIN (vehicle photo stub for now)
 *   • OrderActionRow    — sticky Cancel CTA when status is cancellable
 *
 * CRITICAL — Otto callback polling (MOBILE_API_CONTRACT.md v0.11 §4):
 *   When status ∈ { reservation_pending, payment_pending } refetchInterval
 *   fires every 3s for the first 60s, then every 10s for 5min, then stops.
 *   Transition to any terminal status stops polling immediately. The cadence
 *   logic lives in src/hooks/useOrderPolling.ts (`getOrderPollInterval`).
 *
 * CRITICAL — 409 cancel race (MOBILE_API_CONTRACT.md v0.11 §5):
 *   When the cancel POST returns 409 with `error.code === 'ORDER_NOT_CANCELLABLE'`
 *   we alert the user with a translated message, force-refetch the detail query,
 *   and the Cancel button disables once status is no longer cancellable.
 *   Idempotency-Key header on the POST is generated per attempt.
 */

import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, Alert, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios, { AxiosError } from 'axios';
import type { OrderDetailDto } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../src/theme/colors';
import { ordersPublicApiClient } from '../../src/services/http';
import {
  OrderDetailHeader,
  ReservationCountdown,
  OrderSummaryCard,
  StatusTimeline,
  PaymentSummaryCard,
  VehicleCard,
  OrderActionRow,
  CancelConfirmModal,
  newIdempotencyKey,
} from '../../src/components/orders';
import {
  getOrderPollInterval,
  isOrderCancellable,
} from '../../src/hooks/useOrderPolling';

export default function OrderDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Wall-clock anchor for the staged polling cadence. Captured ONCE when the
  // screen mounts; the useOrderPolling hook derives the next interval from
  // (status, Date.now() - startedAt).
  const startedAtRef = useRef<number>(Date.now());

  const [modalOpen, setModalOpen] = useState(false);

  // ─── Detail query with Otto-callback polling ──────────────────────────────

  const queryKey = ['orders', 'detail', id] as const;

  const { data: order, isLoading, isError, refetch } = useQuery<OrderDetailDto, Error>({
    queryKey,
    queryFn: () => ordersPublicApiClient.getById(id),
    enabled: typeof id === 'string' && id.length > 0,
    refetchInterval: (query) => {
      const elapsed = Date.now() - startedAtRef.current;
      return getOrderPollInterval(query.state.data?.status, elapsed);
    },
    // While polling is active, keep refetching even when the app is backgrounded.
    // (Otto callback might land while the user is in Safari completing payment.)
    refetchIntervalInBackground: true,
  });

  // ─── Cancel mutation with 409 race handling ───────────────────────────────

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const key = newIdempotencyKey();
      return ordersPublicApiClient.cancel(id, key);
    },
    onSuccess: (data) => {
      // Server returned the updated detail — push it straight into the cache.
      queryClient.setQueryData<OrderDetailDto>(queryKey, data);
      setModalOpen(false);
    },
    onError: async (err: unknown) => {
      setModalOpen(false);

      // 409 race — Otto has already started processing the payment, so the
      // cancel was refused. Refresh the detail and surface a non-blocking alert.
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const code = (err.response.data as { error?: { code?: string } } | undefined)
          ?.error?.code;
        if (code === 'ORDER_NOT_CANCELLABLE') {
          // Force re-fetch so the cancellable predicate flips and the CTA disables.
          await refetch();
          Alert.alert(
            t('orders.cancel.errorRaceTitle'),
            t('orders.cancel.errorRaceBody'),
          );
          return;
        }
      }

      // Generic failure path.
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { error?: { message?: string } } | undefined)?.error
              ?.message ?? t('orders.cancel.errorGeneric')
          : t('orders.cancel.errorGeneric');
      Alert.alert(t('orders.cancel.modalTitle'), message);
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/orders' as Parameters<typeof router.replace>[0]);
  }, []);

  const handleCancelPress = useCallback(() => {
    setModalOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(() => {
    cancelMutation.mutate();
  }, [cancelMutation]);

  const handleDismissModal = useCallback(() => {
    if (!cancelMutation.isPending) setModalOpen(false);
  }, [cancelMutation.isPending]);

  // ─── Render branches ──────────────────────────────────────────────────────

  const shortRef =
    typeof id === 'string' && id.length >= 8
      ? `#${id.slice(-8).toUpperCase()}`
      : '#—';

  if (isLoading || !order) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <OrderDetailHeader shortRef={shortRef} onBack={handleBack} />
        <View style={styles.centerState}>
          <Text style={styles.muted}>{t('orders.detail.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <OrderDetailHeader shortRef={shortRef} onBack={handleBack} />
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>{t('orders.detail.error')}</Text>
          <Text style={styles.muted}>{t('orders.detail.retry')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const cancellable = isOrderCancellable(order.status);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OrderDetailHeader shortRef={shortRef} onBack={handleBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <ReservationCountdown
          expiresAt={order.reservationExpiresAt}
          status={order.status}
        />
        <OrderSummaryCard order={order} />
        <StatusTimeline status={order.status} />
        <PaymentSummaryCard payments={order.payments} />
        <VehicleCard listingId={order.listingId} stockNumber={order.stockNumber} />
      </ScrollView>

      <OrderActionRow
        cancellable={cancellable}
        pending={cancelMutation.isPending}
        onCancelPress={handleCancelPress}
      />

      <CancelConfirmModal
        visible={modalOpen}
        pending={cancelMutation.isPending}
        reservationFeeFils={order.reservationAmountFils}
        onConfirm={handleConfirmCancel}
        onDismiss={handleDismissModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: slate[50],
  },
  scroll: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  muted: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: slate[500],
  },
  errorTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: slate[900],
    textAlign: 'center',
  },
});

// Silence unused-import lint until VehicleCard ever needs `brand`.
void brand;
