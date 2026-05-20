/**
 * CancelConfirmModal — destructive confirmation before sending the cancel POST.
 *
 * Required by Task #65 hard constraint: irreversible action MUST gate behind a
 * confirm modal. Red CTA is the only red-coloured button on this surface.
 *
 * G2+G3: Adds refund copy line interpolated with the reservation fee amount via
 * formatKwd(). Uses t() for all user-visible copy.
 */

import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { red, slate } from '../../theme/colors';
import { formatKwd } from './orders.utils';

interface Props {
  visible: boolean;
  pending: boolean;
  /** Reservation fee in fils (string or number). Used to build refund copy. */
  reservationFeeFils: string | number;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function CancelConfirmModal({
  visible,
  pending,
  reservationFeeFils,
  onConfirm,
  onDismiss,
}: Props) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={pending ? undefined : onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('orders.cancel.modalTitle')}</Text>
          <Text style={styles.body}>{t('orders.cancel.modalBody')}</Text>
          <Text style={styles.refundCopy}>
            {t('orders.cancel.refundCopy', { amount: formatKwd(reservationFeeFils) })}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnDismiss]}
              onPress={onDismiss}
              disabled={pending}
              accessibilityRole="button"
              accessibilityLabel={t('orders.cancel.dismiss')}
            >
              <Text style={styles.btnDismissText}>{t('orders.cancel.dismiss')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnConfirm]}
              onPress={onConfirm}
              disabled={pending}
              accessibilityRole="button"
              accessibilityLabel={t('orders.cancel.confirm')}
            >
              {pending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.btnConfirmText}>{t('orders.cancel.confirm')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)', // slate-900 @ 55%
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: slate[900],
    marginBottom: 10,
  },
  body: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: slate[600],
    lineHeight: 20,
    marginBottom: 8,
  },
  refundCopy: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: slate[700],
    lineHeight: 19,
    marginBottom: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
    paddingHorizontal: 16,
  },
  btnDismiss: {
    backgroundColor: slate[100],
  },
  btnDismissText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: slate[900],
  },
  btnConfirm: {
    backgroundColor: red[500],
  },
  btnConfirmText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
