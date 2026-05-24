/**
 * CancelBookingModal — destructive confirm for cancelling a sell booking.
 *
 * Red (destructive) button — the ONLY non-brand-blue CTA in this flow,
 * consistent with the global hard-constraint: red ONLY for destructive actions.
 *
 * On confirm: POST /v1/public/me/sell-bookings/:bookingRef/cancel (B v1.5.14)
 *   200 → onSuccess() + onClose()
 *   409 BOOKING_NOT_CANCELLABLE → inline error + suggest refetch
 *   404 BOOKING_NOT_FOUND → close + alert
 *   422 VALIDATION_ERROR → inline error (reason field)
 */

import { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { slate, red } from '../../theme/colors';
import { meSellBookingsApiClient } from '../../services/http';
import { sellBookingsKeys } from '../../services/sell-bookings.keys';
import {
  CancelBookingNotFoundError,
  CancelBookingNotCancellableError,
} from '@behbehani-cpo/data-access-mobile';

interface Props {
  visible: boolean;
  bookingRef: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelBookingModal({ visible, bookingRef, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setReason('');
    setInlineError(null);
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(async () => {
    if (submitting) return;
    setInlineError(null);
    setSubmitting(true);
    try {
      await meSellBookingsApiClient.cancel(bookingRef, reason.trim() ? { reason: reason.trim() } : undefined);
      await qc.invalidateQueries({ queryKey: sellBookingsKeys.all });
      setReason('');
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof CancelBookingNotCancellableError) {
        setInlineError(
          t(
            'sellTracker.cancelModal.errorNotCancellable',
            'This booking can no longer be cancelled. Pull to refresh for the latest status.',
          ),
        );
      } else if (err instanceof CancelBookingNotFoundError) {
        handleClose();
        Alert.alert(
          t('sellTracker.cancelModal.errorNotFoundTitle', 'Booking not found'),
          t('sellTracker.cancelModal.errorNotFoundBody', 'This booking could not be found. It may have already been removed.'),
        );
      } else {
        setInlineError(
          t('sellTracker.cancel.errorBody', 'Could not cancel — please try again.'),
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [bookingRef, handleClose, onClose, onSuccess, qc, reason, submitting, t]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>
            {t('sellTracker.cancelModal.title', 'Cancel this booking?')}
          </Text>
          <Text style={styles.body}>
            {t(
              'sellTracker.cancelModal.body',
              'This will permanently cancel your concierge inspection booking. This action cannot be undone.',
            )}
          </Text>

          <TextInput
            style={styles.reasonInput}
            placeholder={t('sellTracker.cancelModal.reasonPlaceholder', 'Reason (optional)')}
            placeholderTextColor={slate[400]}
            value={reason}
            onChangeText={setReason}
            maxLength={200}
            multiline
            numberOfLines={2}
            returnKeyType="done"
            blurOnSubmit
            accessibilityLabel={t('sellTracker.cancelModal.reasonPlaceholder', 'Reason (optional)')}
          />

          {inlineError ? (
            <Text style={styles.inlineError}>{inlineError}</Text>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.keepBtn}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={t('sellTracker.cancelModal.cancelCta', 'Keep booking')}
            >
              <Text style={styles.keepBtnText}>
                {t('sellTracker.cancelModal.cancelCta', 'Keep booking')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelBtn, submitting && styles.cancelBtnDisabled]}
              onPress={() => void handleConfirm()}
              accessibilityRole="button"
              disabled={submitting}
              accessibilityLabel={t('sellTracker.cancel.confirmA11y', 'Confirm cancellation')}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.cancelBtnText}>
                  {t('sellTracker.cancelModal.confirmCta', 'Cancel booking')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  sheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: slate[900],
    textAlign: 'center',
  },
  body: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: slate[600],
    textAlign: 'center',
    lineHeight: 20,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: slate[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: slate[900],
    minHeight: 56,
    textAlignVertical: 'top',
  },
  inlineError: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: red[700],
    textAlign: 'center',
    lineHeight: 18,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  keepBtn: {
    minHeight: 52,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: slate[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: slate[800],
  },
  // Red — destructive ONLY (global constraint)
  cancelBtn: {
    minHeight: 52,
    borderRadius: 9999,
    backgroundColor: red[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnDisabled: {
    opacity: 0.6,
  },
  cancelBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
