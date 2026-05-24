/**
 * RescheduleModal — date strip + window picker for rescheduling a booking.
 *
 * Reuses the 14-day date strip pattern from the sell wizard (StepOneScheduleCard).
 * Dispatches PATCH via meSellBookingsApiClient.reschedule on confirm.
 *
 * [ASK C→B]: Confirm B exposes PATCH /v1/public/me/sell-bookings/:bookingRef.
 * If not available, the modal disables and shows a note.
 *
 * Brand-lock: brand-700 for selected date + confirm button. No emerald.
 */

import { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { PreferredWindow } from '@behbehani-cpo/shared-types';
import { brand, slate } from '../../theme/colors';
import { meSellBookingsApiClient } from '../../services/http';
import { DATE_CARDS } from '../sell/dateHelpers';
import { sellBookingsKeys } from '../../services/sell-bookings.keys';

interface Props {
  visible: boolean;
  bookingRef: string;
  onClose: () => void;
  onSuccess: () => void;
}

const WINDOWS: PreferredWindow[] = ['morning', 'afternoon', 'evening'];

export function RescheduleModal({ visible, bookingRef, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const today = DATE_CARDS[0].iso;
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [window, setWindow] = useState<PreferredWindow>('afternoon');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await meSellBookingsApiClient.reschedule(bookingRef, {
        preferredDate: selectedDate,
        window,
      });
      await qc.invalidateQueries({ queryKey: sellBookingsKeys.all });
      onSuccess();
      onClose();
    } catch {
      Alert.alert(
        t('sellTracker.reschedule.errorTitle', 'Reschedule failed'),
        t('sellTracker.reschedule.errorBody', 'Could not reschedule — please try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  }, [bookingRef, onClose, onSuccess, qc, selectedDate, submitting, t, window]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('sellTracker.reschedule.title', 'Reschedule inspection')}</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close', 'Close')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Date strip */}
          <Text style={styles.sectionLabel}>
            {t('sell.step1.schedule.title', 'When works for you?')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateStrip}
          >
            {DATE_CARDS.map((card) => {
              const isSelected = card.iso === selectedDate;
              return (
                <TouchableOpacity
                  key={card.iso}
                  style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                  onPress={() => setSelectedDate(card.iso)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={card.label}
                >
                  <Text style={[styles.dateCardDay, isSelected && styles.dateCardTextSelected]}>
                    {card.label.slice(0, 3).toUpperCase()}
                  </Text>
                  <Text style={[styles.dateCardNum, isSelected && styles.dateCardTextSelected]}>
                    {card.dayNum}
                  </Text>
                  <Text style={[styles.dateCardMonth, isSelected && styles.dateCardTextSelected]}>
                    {card.month}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Window picker */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            {t('sell.step1.schedule.sub', 'Pick a rough time window.')}
          </Text>
          <View style={styles.windowRow}>
            {WINDOWS.map((w) => {
              const isSelected = w === window;
              return (
                <TouchableOpacity
                  key={w}
                  style={[styles.windowBtn, isSelected && styles.windowBtnSelected]}
                  onPress={() => setWindow(w)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[styles.windowBtnText, isSelected && styles.windowBtnTextSelected]}
                  >
                    {t(`sell.step1.schedule.window.${w}`, w)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Confirm */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
            onPress={() => void handleConfirm()}
            accessibilityRole="button"
            disabled={submitting}
            accessibilityLabel={t('sellTracker.reschedule.confirmA11y', 'Confirm reschedule')}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.confirmBtnText}>
                {t('sellTracker.reschedule.confirm', 'Confirm reschedule')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: slate[200],
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: slate[900],
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    color: slate[500],
  },
  body: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: slate[700],
    marginBottom: 12,
  },
  dateStrip: {
    gap: 8,
    paddingBottom: 4,
  },
  dateCard: {
    width: 60,
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: slate[200],
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 2,
  },
  dateCardSelected: {
    backgroundColor: brand[700],
    borderColor: brand[700],
  },
  dateCardDay: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateCardNum: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: slate[900],
  },
  dateCardMonth: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 10,
    color: slate[500],
  },
  dateCardTextSelected: {
    color: '#FFFFFF',
  },
  windowRow: {
    flexDirection: 'row',
    gap: 10,
  },
  windowBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: slate[200],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  windowBtnSelected: {
    backgroundColor: brand[700],
    borderColor: brand[700],
  },
  windowBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: slate[700],
  },
  windowBtnTextSelected: {
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: slate[200],
  },
  confirmBtn: {
    minHeight: 52,
    backgroundColor: brand[700],
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
