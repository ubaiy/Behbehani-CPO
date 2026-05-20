/**
 * ReservationCountdown — live "Expires in Xh Ym" card shown on the order
 * detail screen when the order is still awaiting payment.
 *
 * Spec (Task G2+G3):
 *   • Visible only when status === 'reservation_pending' | 'payment_pending'
 *   • Ticks every 1 second via setInterval; cleanup on unmount / status change.
 *   • brand[900] text when time remains; red[600] when < 1 hour.
 *   • "Reservation expired" in red[600] when Date.now() >= expiresAt.
 *
 * CRITICAL cleanup pattern — interval is cleared in useEffect return:
 *   return () => clearInterval(id);
 * This prevents memory leaks on re-render and navigation away.
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { OrderStatusValue } from '@behbehani-cpo/shared-types';
import { brand, red, slate } from '../../theme/colors';

interface Props {
  expiresAt: string; // ISO-8601 from OrderDetailDto
  status: OrderStatusValue;
}

interface Remaining {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

function getRemainingMs(expiresAt: string): number {
  return new Date(expiresAt).getTime() - Date.now();
}

function decompose(ms: number): Remaining {
  if (ms <= 0) return { hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds, totalMs: ms };
}

const ACTIVE_STATUSES: ReadonlyArray<OrderStatusValue> = [
  'reservation_pending',
  'payment_pending',
];

export function ReservationCountdown({ expiresAt, status }: Props) {
  const { t } = useTranslation();

  const [remaining, setRemaining] = useState<Remaining>(() =>
    decompose(getRemainingMs(expiresAt)),
  );

  useEffect(() => {
    if (!ACTIVE_STATUSES.includes(status)) return;

    // Tick immediately so the display is up-to-date before the first interval fires.
    setRemaining(decompose(getRemainingMs(expiresAt)));

    const id = setInterval(() => {
      setRemaining(decompose(getRemainingMs(expiresAt)));
    }, 1000);

    return () => clearInterval(id);
  }, [status, expiresAt]);

  if (!ACTIVE_STATUSES.includes(status)) return null;

  const expired = remaining.totalMs <= 0;
  const urgent = !expired && remaining.hours < 1;

  return (
    <View style={styles.card}>
      {expired ? (
        <Text style={styles.expired}>
          {t('orders.countdown.expired')}
        </Text>
      ) : (
        <View style={styles.timerRow}>
          <Text style={styles.timerLabel}>{t('orders.countdown.expiresIn')}</Text>
          <Text style={[styles.timerValue, urgent && styles.timerUrgent]}>
            {remaining.hours > 0
              ? t('orders.countdown.hoursMinutesShort', {
                  h: remaining.hours,
                  m: String(remaining.minutes).padStart(2, '0'),
                })
              : `${remaining.minutes}m ${String(remaining.seconds).padStart(2, '0')}s`}
          </Text>
        </View>
      )}
      {!expired && (
        <Text style={styles.helpText}>{t('orders.countdown.help')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 16,
    gap: 6,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: slate[600],
  },
  timerValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: brand[900],
    letterSpacing: -0.5,
  },
  timerUrgent: {
    color: red[500],
  },
  expired: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: red[500],
    textAlign: 'center',
  },
  helpText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: slate[500],
    lineHeight: 17,
  },
});
