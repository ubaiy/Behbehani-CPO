/**
 * OrderActionRow — sticky bottom action row on the detail screen.
 * Shows the destructive Cancel CTA only when the order is cancellable.
 *
 * Red is intentional — the only red surface on this screen — per Task #65 brand
 * rule: "Red ONLY for destructive (cancel button + failed status)".
 */

import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { red, slate } from '../../theme/colors';

interface Props {
  cancellable: boolean;
  pending: boolean;
  onCancelPress: () => void;
}

export function OrderActionRow({ cancellable, pending, onCancelPress }: Props) {
  const { t } = useTranslation();

  if (!cancellable) return null;

  return (
    <View style={styles.bar}>
      <TouchableOpacity
        style={[styles.btn, pending && styles.btnDisabled]}
        onPress={onCancelPress}
        disabled={pending}
        accessibilityRole="button"
        accessibilityLabel={t('orders.actions.cancelBtnA11y')}
      >
        {pending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.btnText}>{t('orders.actions.cancelBtn')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: slate[200],
  },
  btn: {
    minHeight: 48,
    borderRadius: 9999,
    backgroundColor: red[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
