/**
 * QuickActionsRow — 3-up action bar: Calendar / Reschedule / Cancel.
 *
 * Calendar: generates a .ics content string and shares via expo-sharing or
 *   Share.share() (whichever is available). Graceful degradation if neither
 *   is available.
 * Reschedule: opens RescheduleModal (date strip + window).
 * Cancel: opens CancelBookingModal (red destructive confirm).
 *
 * Brand-lock: calendar + reschedule use brand-50/brand-700. Cancel is
 * red-700 (destructive only, global constraint).
 */

import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ConciergeBookingStatus } from '@behbehani-cpo/shared-types';
import { brand, slate, red } from '../../theme/colors';
import { RescheduleModal } from './RescheduleModal';
import { CancelBookingModal } from './CancelBookingModal';


// ─── ICS generation ──────────────────────────────────────────────────────────

function buildIcs(booking: ConciergeBookingStatus): string {
  const pref = booking.customerPreference;
  const dateStr = pref?.preferredDate ?? new Date().toISOString().slice(0, 10);
  const start = dateStr.replace(/-/g, ''); // e.g. 20260525
  // Use full-day event (no specific time) since window is approximate.
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Behbehani CPO//Mobile//EN',
    'BEGIN:VEVENT',
    `UID:${booking.bookingRef}@behbehani-cpo`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${start}`,
    `SUMMARY:Behbehani CPO Inspection — ${booking.bookingRef}`,
    `DESCRIPTION:Concierge sell inspection ref ${booking.bookingRef}. Inspector will contact you to confirm exact time.`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

async function shareIcs(booking: ConciergeBookingStatus): Promise<void> {
  const icsContent = buildIcs(booking);

  // Try expo-sharing with a temp file first.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const FileSystem = require('expo-file-system') as {
      documentDirectory: string | null;
      writeAsStringAsync(path: string, content: string): Promise<void>;
    };
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const Sharing = require('expo-sharing') as {
      shareAsync(path: string, opts?: object): Promise<void>;
    };
    const path = `${FileSystem.documentDirectory ?? ''}booking-${booking.bookingRef}.ics`;
    await FileSystem.writeAsStringAsync(path, icsContent);
    await Sharing.shareAsync(path, { mimeType: 'text/calendar', UTI: 'public.calendar-event' });
    return;
  } catch {
    // expo-sharing or expo-file-system unavailable — fall through.
  }

  // Fallback: Share.share with ics text as message.
  try {
    await Share.share({
      title: `Inspection booking ${booking.bookingRef}`,
      message: icsContent,
    });
  } catch {
    // Share also unavailable — silent no-op.
    console.warn('[QuickActionsRow] Calendar share unavailable on this platform.');
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  booking: ConciergeBookingStatus;
  bookingRef: string;
  onRescheduleSuccess: () => void;
  onCancelSuccess: () => void;
}

export function QuickActionsRow({ booking, bookingRef, onRescheduleSuccess, onCancelSuccess }: Props) {
  const { t } = useTranslation();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // v0.23 — gate Reschedule on status === 'draft' per B v1.5.13 policy
  // (server returns 409 BOOKING_NOT_RESCHEDULABLE for any non-draft status).
  // Pre-empt the 409 by disabling the button + showing a clear hint.
  const canReschedule = booking.status === 'draft';

  const handleCancelTap = useCallback(() => {
    setCancelOpen(true);
  }, []);

  const handleRescheduleTap = useCallback(() => {
    if (!canReschedule) {
      Alert.alert(
        t('sellTracker.quickActions.rescheduleLockedTitle', 'Reschedule unavailable'),
        t(
          'sellTracker.quickActions.rescheduleLockedBody',
          'Your inspector is already assigned. Contact Behbehani Motors support to change the window.',
        ),
        [{ text: t('sellTracker.quickActions.rescheduleLockedDismiss', 'OK') }],
      );
      return;
    }
    setRescheduleOpen(true);
  }, [canReschedule, t]);

  const handleCalendar = useCallback(() => {
    void shareIcs(booking);
  }, [booking]);

  return (
    <>
      <View style={styles.row}>
        {/* Calendar */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleCalendar}
          accessibilityRole="button"
          accessibilityLabel={t('sellTracker.quickActions.calendarA11y', 'Add to calendar')}
        >
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={styles.actionLabel}>
            {t('sellTracker.quickActions.calendar', 'Calendar')}
          </Text>
        </TouchableOpacity>

        {/* Reschedule — gated on status === 'draft' (B v1.5.13 §1 policy) */}
        <TouchableOpacity
          style={[styles.actionBtn, !canReschedule && styles.actionBtnDisabled]}
          onPress={handleRescheduleTap}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canReschedule }}
          accessibilityLabel={t('sellTracker.quickActions.rescheduleA11y', 'Reschedule inspection')}
        >
          <Text style={[styles.actionIcon, !canReschedule && styles.actionIconDisabled]}>🗓</Text>
          <Text style={[styles.actionLabel, !canReschedule && styles.actionLabelDisabled]}>
            {t('sellTracker.quickActions.reschedule', 'Reschedule')}
          </Text>
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.cancelActionBtn]}
          onPress={handleCancelTap}
          accessibilityRole="button"
          accessibilityLabel={t('sellTracker.quickActions.cancelA11y', 'Cancel booking')}
        >
          <Text style={[styles.actionIcon, styles.cancelIcon]}>✕</Text>
          <Text style={[styles.actionLabel, styles.cancelLabel]}>
            {t('sellTracker.quickActions.cancel', 'Cancel')}
          </Text>
        </TouchableOpacity>
      </View>

      <RescheduleModal
        visible={rescheduleOpen}
        bookingRef={bookingRef}
        onClose={() => setRescheduleOpen(false)}
        onSuccess={onRescheduleSuccess}
      />
      <CancelBookingModal
        visible={cancelOpen}
        bookingRef={bookingRef}
        onClose={() => setCancelOpen(false)}
        onSuccess={onCancelSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    minHeight: 72,
    backgroundColor: brand[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: brand[100],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  cancelActionBtn: {
    backgroundColor: '#FEF2F2', // red-50 equivalent
    borderColor: '#FECACA', // red-200 equivalent
  },
  actionBtnDisabled: {
    opacity: 0.55,
  },
  actionIconDisabled: {
    color: slate[400],
  },
  actionLabelDisabled: {
    color: slate[500],
  },
  actionIcon: {
    fontSize: 22,
    color: brand[700],
  },
  cancelIcon: {
    color: red[700],
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
  },
  actionLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: brand[700],
    textAlign: 'center',
  },
  cancelLabel: {
    color: red[700],
  },
});
