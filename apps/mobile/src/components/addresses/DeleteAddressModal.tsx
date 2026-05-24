/**
 * DeleteAddressModal — confirmation dialog for address deletion.
 *
 * Task v0.18.b — extracted from app/addresses/index.tsx to keep route < 500 lines.
 */

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { slate, red } from '../../theme/colors';

export function DeleteAddressModal({
  visible,
  addressLabel,
  onCancel,
  onConfirm,
  deleting,
}: {
  visible: boolean;
  addressLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('addresses.deleteTitle')}</Text>
          <Text style={styles.body}>
            {t('addresses.deleteBody', { label: addressLabel })}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.keepBtn}
              onPress={onCancel}
              accessibilityLabel={t('addresses.deleteCancel')}
            >
              <Text style={styles.keepBtnText}>{t('addresses.deleteCancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, deleting && styles.confirmBtnDisabled]}
              onPress={onConfirm}
              disabled={deleting}
              accessibilityLabel={t('addresses.deleteConfirm')}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>{t('addresses.deleteConfirm')}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: slate[900],
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: slate[600],
    marginBottom: 24,
    lineHeight: 22,
  },
  actions: { flexDirection: 'row', gap: 12 },
  keepBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: slate[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepBtnText: { fontSize: 15, fontWeight: '500', color: slate[700] },
  confirmBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: red[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: { backgroundColor: slate[200] },
  confirmBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
