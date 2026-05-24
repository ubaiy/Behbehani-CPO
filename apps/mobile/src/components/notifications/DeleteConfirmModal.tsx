/**
 * DeleteConfirmModal — destructive confirm dialog for notification deletion.
 *
 * Red is used ONLY for the destructive confirm button (per brand constraint).
 * Cancel is neutral. Touches ≥ 44px on both actions.
 */

import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { slate } from '../../theme/colors';

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ visible, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => { /* prevent backdrop close */ }}>
          <Text style={styles.title}>
            {t('notifications.delete.modalTitle')}
          </Text>
          <Text style={styles.body}>
            {t('notifications.delete.modalBody')}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.delete.cancel')}
            >
              <Text style={styles.btnCancelText}>
                {t('notifications.delete.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnConfirm]}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.delete.confirm')}
            >
              <Text style={styles.btnConfirmText}>
                {t('notifications.delete.confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
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
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 13,
  },
  btnCancel: {
    backgroundColor: slate[100],
  },
  btnCancelText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: slate[700],
  },
  btnConfirm: {
    backgroundColor: '#DC2626', // red-600 — destructive only
  },
  btnConfirmText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
