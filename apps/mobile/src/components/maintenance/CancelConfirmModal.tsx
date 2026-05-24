/**
 * CancelConfirmModal — destructive cancel confirmation for maintenance requests.
 *
 * Used in /maintenance/[id] when status === 'pending_review'.
 * Red confirm CTA (destructive); dismiss keeps the request open.
 */

import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { slate, red } from '../../theme/colors';

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function CancelConfirmModal({ visible, onConfirm, onDismiss }: Props) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onDismiss}
        accessible={false}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>
            {t('maintenance.detail.cancelConfirmTitle')}
          </Text>
          <Text style={styles.body}>
            {t('maintenance.detail.cancelConfirmBody')}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            >
              <Text style={styles.dismissText}>{t('common.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={t('maintenance.detail.cancelBtn')}
            >
              <Text style={styles.confirmText}>
                {t('maintenance.detail.cancelBtn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
    gap: 12,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: slate[900],
    marginBottom: 4,
  },
  body: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: slate[600],
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  dismissBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: slate[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: slate[700],
  },
  confirmBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: red[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
