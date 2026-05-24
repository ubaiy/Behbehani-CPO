/**
 * SaveCurrentSearchModal — let the user name and persist their current browse
 * filter as a saved search.
 *
 * Opened from the Browse screen's "Save this search" CTA.
 * On confirm:
 *   1. toBackendPayload(currentFilters) to convert camelCase → snake_case.
 *   2. meSavedSearchesApiClient.create({ name, queryPayload, notifyOnMatch }).
 *   3. On success: call onSuccess (parent shows toast / dismisses modal).
 *   4. On error: show inline error inside the modal.
 *
 * An Idempotency-Key is generated per attempt (newIdempotencyKey pattern from
 * orders.utils) and injected as a request header via axios config.
 */

import { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { brand, slate } from '../../theme/colors';
import type { BrowseFilters } from '../FilterSheet';
import { toBackendPayload } from './queryPayloadTransform';
import { meSavedSearchesApiClient } from '../../services/http';
import { newIdempotencyKey } from '../orders/orders.utils';

interface Props {
  visible: boolean;
  currentFilters: BrowseFilters;
  onSuccess: () => void;
  onDismiss: () => void;
}

export function SaveCurrentSearchModal({
  visible,
  currentFilters,
  onSuccess,
  onDismiss,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [notifyOnMatch, setNotifyOnMatch] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDismiss = useCallback(() => {
    if (pending) return;
    setName('');
    setNotifyOnMatch(false);
    setError(null);
    onDismiss();
  }, [pending, onDismiss]);

  const handleSubmit = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('savedSearches.save.nameLabel') + ' is required');
      return;
    }

    const queryPayload = toBackendPayload(currentFilters);

    // Guard: backend refine() requires at least one field.
    if (Object.keys(queryPayload).length === 0) {
      setError('No active filters to save.');
      return;
    }

    setPending(true);
    setError(null);

    const idempotencyKey = newIdempotencyKey().replace('mob-cancel-', 'mob-save-');

    try {
      await meSavedSearchesApiClient.create(
        { name: trimmedName, queryPayload, notifyOnMatch },
        idempotencyKey,
      );

      setName('');
      setNotifyOnMatch(false);
      onSuccess();
    } catch {
      setError(t('common.error'));
    } finally {
      setPending(false);
    }
  }, [name, notifyOnMatch, currentFilters, t, onSuccess]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{t('savedSearches.save.modalTitle')}</Text>
              <TouchableOpacity
                onPress={handleDismiss}
                disabled={pending}
                accessibilityRole="button"
                accessibilityLabel={t('common.closeA11y')}
                style={styles.closeBtn}
              >
                <Text style={styles.closeText}>{'✕'}</Text>
              </TouchableOpacity>
            </View>

            {/* Name input */}
            <Text style={styles.label}>{t('savedSearches.save.nameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('savedSearches.save.namePlaceholder')}
              placeholderTextColor={slate[400]}
              maxLength={120}
              returnKeyType="done"
              editable={!pending}
              accessibilityLabel={t('savedSearches.save.nameLabel')}
            />

            {/* Notify toggle — backend supports notifyOnMatch on SavedSearchDto */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t('savedSearches.save.notifyToggle')}</Text>
              <Switch
                value={notifyOnMatch}
                onValueChange={setNotifyOnMatch}
                disabled={pending}
                trackColor={{ true: brand[700], false: slate[300] }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Error */}
            {error !== null ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={handleDismiss}
                disabled={pending}
                accessibilityRole="button"
                accessibilityLabel={t('savedSearches.save.cancel')}
              >
                <Text style={styles.btnCancelText}>{t('savedSearches.save.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnSubmit]}
                onPress={() => void handleSubmit()}
                disabled={pending}
                accessibilityRole="button"
                accessibilityLabel={t('savedSearches.save.submit')}
              >
                {pending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnSubmitText}>{t('savedSearches.save.submit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: slate[900],
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  closeText: {
    fontSize: 17,
    color: slate[500],
  },
  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: slate[700],
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: slate[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: slate[900],
    minHeight: 48,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: slate[700],
    flex: 1,
    marginRight: 12,
  },
  errorText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: '#EF4444',
    marginTop: -4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
    paddingHorizontal: 16,
  },
  btnCancel: {
    backgroundColor: slate[100],
  },
  btnCancelText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: slate[900],
  },
  btnSubmit: {
    backgroundColor: brand[900],
  },
  btnSubmitText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
