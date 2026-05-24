/**
 * SignOutAllConfirmModal — destructive confirmation modal for "Sign out everywhere".
 *
 * Shows a centered modal overlay with:
 *   - Title + body warning text
 *   - Cancel button (slate, non-destructive)
 *   - Confirm button (red[600], ≥48px — destructive)
 *
 * Caller controls visibility via `visible` prop.
 * Confirm button shows spinner while `isLoading` is true.
 */

import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { slate } from '../../theme/colors';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SignOutAllConfirmModalProps {
  visible: boolean;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  labels: {
    title: string;
    body: string;
    cancelBtn: string;
    confirmBtn: string;
    confirmingBtn: string;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SignOutAllConfirmModal({
  visible,
  isLoading,
  onCancel,
  onConfirm,
  labels,
}: SignOutAllConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{labels.title}</Text>
          <Text style={styles.body}>{labels.body}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={labels.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>{labels.cancelBtn}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, isLoading && styles.confirmBtnDisabled]}
              onPress={onConfirm}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={isLoading ? labels.confirmingBtn : labels.confirmBtn}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>{labels.confirmBtn}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: slate[900],
    marginBottom: 8,
  },
  body: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: slate[500],
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: slate[200],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: slate[700],
  },
  confirmBtn: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
