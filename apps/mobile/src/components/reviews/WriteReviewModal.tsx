/**
 * WriteReviewModal — star input + title + body + submit.
 *
 * Handles inline:
 *   403 REVIEW_TARGET_NOT_REVIEWABLE — shown as inline error
 *   409 REVIEW_ALREADY_SUBMITTED     — shown with delete-then-resubmit hint
 *
 * Idempotency-Key: generated once per modal open (stable UUID).
 * Title max: 80 chars. Body max: 1000 chars (with counter).
 * Star brand lock: brand[700] filled, slate[300] empty — NO yellow.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReviewTarget } from '@behbehani-cpo/shared-types';
import { brand, slate, red } from '../../theme/colors';
import { StarRatingInput } from './StarRatingInput';
import { meReviewsApiClient } from '../../services/http';

// ─── Idempotency key helper ───────────────────────────────────────────────────

function newUUID(): string {
  // RFC 4122 v4 — uses Math.random() as push-safe fallback for RN environments
  // without crypto.randomUUID. Replace with crypto.randomUUID() when RN ships it.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  target: ReviewTarget;
  onDismiss: () => void;
  onSuccess: () => void;
}

// ─── Error code extraction ────────────────────────────────────────────────────

function extractErrorCode(error: unknown): string | null {
  try {
    const axiosErr = error as { response?: { data?: { error?: { code?: string } } } };
    return axiosErr?.response?.data?.error?.code ?? null;
  } catch {
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WriteReviewModal({ visible, target, onDismiss, onSuccess }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Stable idempotency key per modal open
  const idempotencyKey = useRef<string>(newUUID());

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setRating(0);
      setTitle('');
      setBody('');
      setInlineError(null);
      idempotencyKey.current = newUUID();
    }
  }, [visible]);

  const { mutate, status } = useMutation({
    mutationFn: () =>
      meReviewsApiClient.create(
        { target, rating, title: title.trim(), body: body.trim() },
        idempotencyKey.current,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reviews', 'me'] });
      void queryClient.invalidateQueries({ queryKey: ['reviews', 'listing'] });
      onSuccess();
    },
    onError: (error) => {
      const code = extractErrorCode(error);
      if (code === 'REVIEW_TARGET_NOT_REVIEWABLE') {
        setInlineError(t('reviews.write.errorTargetNotReviewable'));
      } else if (code === 'REVIEW_ALREADY_SUBMITTED') {
        setInlineError(t('reviews.write.errorAlreadySubmitted'));
      } else {
        setInlineError(t('common.error'));
      }
    },
  });

  const isPending = status === 'pending';

  const handleSubmit = useCallback(() => {
    if (rating === 0 || !title.trim() || !body.trim()) return;
    setInlineError(null);
    mutate();
  }, [rating, title, body, mutate]);

  const canSubmit = rating > 0 && title.trim().length > 0 && body.trim().length > 0 && !isPending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={isPending ? undefined : onDismiss}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.modalTitle}>{t('reviews.write.modalTitle')}</Text>
              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={onDismiss}
                disabled={isPending}
                accessibilityRole="button"
                accessibilityLabel={t('reviews.write.dismiss')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.dismissText}>{'✕'}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Rating */}
              <Text style={styles.fieldLabel}>{t('reviews.write.ratingLabel')}</Text>
              <StarRatingInput value={rating} onChange={setRating} disabled={isPending} size={36} />

              {/* Title */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                {t('reviews.write.titleLabel')}
              </Text>
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={(v) => setTitle(v.slice(0, 80))}
                placeholder={t('reviews.write.titlePlaceholder')}
                placeholderTextColor={slate[400]}
                maxLength={80}
                editable={!isPending}
                returnKeyType="next"
              />
              <Text style={styles.charHint}>
                {t('reviews.write.charsRemaining', { n: 80 - title.length })}
              </Text>

              {/* Body */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                {t('reviews.write.bodyLabel')}
              </Text>
              <TextInput
                style={styles.bodyInput}
                value={body}
                onChangeText={(v) => setBody(v.slice(0, 1000))}
                placeholder={t('reviews.write.bodyPlaceholder')}
                placeholderTextColor={slate[400]}
                maxLength={1000}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                editable={!isPending}
              />
              <Text style={styles.charHint}>
                {t('reviews.write.charsRemaining', { n: 1000 - body.length })}
              </Text>

              {/* Inline error */}
              {inlineError ? (
                <Text style={styles.inlineError}>{inlineError}</Text>
              ) : null}
            </ScrollView>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel={
                isPending ? t('reviews.write.submitting') : t('reviews.write.ctaA11y')
              }
            >
              {isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>{t('reviews.write.submitBtn')}</Text>
              )}
            </TouchableOpacity>
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
    paddingBottom: 32,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: slate[900],
  },
  dismissBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 18,
    color: slate[500],
  },
  scroll: {
    flexShrink: 1,
  },
  fieldLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: slate[700],
    marginBottom: 8,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: slate[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: slate[900],
    minHeight: 44,
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: slate[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: slate[900],
    minHeight: 120,
  },
  charHint: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: slate[400],
    textAlign: 'right',
    marginTop: 4,
  },
  inlineError: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: '#EF4444',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  submitBtn: {
    minHeight: 52,
    backgroundColor: brand[700],
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: {
    backgroundColor: slate[300],
  },
  submitBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
